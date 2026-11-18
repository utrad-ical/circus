import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, afterEach, test } from 'node:test';
import loadConfig, { ConfigLoadError } from './loadConfig.ts';

const originalConfigPath = process.env.CIRCUS_CONFIG;
const fixtureDirectory = mkdtempSync(join(tmpdir(), 'circus-config-'));
const defaultPath = join(
  import.meta.dirname,
  '../../testdata/config/default.js'
);

afterEach(() => {
  if (originalConfigPath === undefined) delete process.env.CIRCUS_CONFIG;
  else process.env.CIRCUS_CONFIG = originalConfigPath;
});
after(() => rmSync(fixtureDirectory, { recursive: true }));

test('uses the explicit container mode ahead of Docker detection', async () => {
  const originalMode = process.env.CIRCUS_CONTAINER_MODE;
  try {
    for (const [mode, expected] of [
      ['0', false],
      ['1', true],
      [undefined, existsSync('/.dockerenv')]
    ] as const) {
      if (mode === undefined) delete process.env.CIRCUS_CONTAINER_MODE;
      else process.env.CIRCUS_CONTAINER_MODE = mode;
      const { isContainerMode } = await import(
        `./loadConfig.ts?container-mode=${mode}`
      );
      assert.equal(isContainerMode, expected);
    }
  } finally {
    if (originalMode === undefined) delete process.env.CIRCUS_CONTAINER_MODE;
    else process.env.CIRCUS_CONTAINER_MODE = originalMode;
  }
});

test('uses built-in defaults when there is no custom configuration', async () => {
  delete process.env.CIRCUS_CONFIG;
  const directory = join(fixtureDirectory, 'empty');
  mkdirSync(directory);
  assert.deepEqual(await loadConfig([defaultPath], directory), {
    a: 10,
    c: 'cat'
  });
  assert.deepEqual(await loadConfig([], directory), {});
});

test('selects the first supported config file in the fixed directory', async () => {
  delete process.env.CIRCUS_CONFIG;
  const directory = join(fixtureDirectory, 'workspace');
  mkdirSync(directory);
  const files = [
    ['circus.config.js', 'export default { format: "js" };', 'js'],
    ['circus.config.mjs', 'export default { format: "mjs" };', 'mjs'],
    ['circus.config.cjs', 'module.exports = { format: "cjs" };', 'cjs'],
    [
      'circus.config.mts',
      'const format: string = "mts"; export default { format };',
      'mts'
    ]
  ] as const;
  for (const [file, source] of files) {
    writeFileSync(join(directory, file), source);
  }

  process.env.CIRCUS_CONFIG = join(directory, 'circus.config.mts');
  assert.deepEqual(await loadConfig([], directory), { format: 'mts' });
  delete process.env.CIRCUS_CONFIG;

  for (const [file, , format] of files) {
    assert.deepEqual(await loadConfig([], directory), { format });
    rmSync(join(directory, file));
  }
});

test('reports a broken config file before considering later candidates', async () => {
  delete process.env.CIRCUS_CONFIG;
  const directory = join(fixtureDirectory, 'broken');
  mkdirSync(directory);
  const broken = join(directory, 'circus.config.mjs');
  writeFileSync(broken, 'export default [];');
  writeFileSync(join(directory, 'circus.config.cjs'), 'module.exports = {};');

  await assert.rejects(loadConfig([], directory), {
    message: `Configuration file ${broken} must export an object`
  });
});

test('reads an explicitly selected ESM .js file and resolves paths from cwd', async () => {
  process.env.CIRCUS_CONFIG = relative(
    process.cwd(),
    join(import.meta.dirname, '../../testdata/config/custom.config.js')
  );
  assert.deepEqual(await loadConfig([defaultPath]), {
    a: 50,
    b: 'banana',
    c: 'cat'
  });
});

test('loads .js files under a package without type using Node module detection', async () => {
  writeFileSync(join(fixtureDirectory, 'package.json'), '{}');
  const commonJs = join(fixtureDirectory, 'common.config.js');
  const esm = join(fixtureDirectory, 'esm.config.js');
  writeFileSync(commonJs, 'module.exports = { mode: "commonjs" };');
  writeFileSync(esm, 'export default { mode: "esm" };');

  process.env.CIRCUS_CONFIG = commonJs;
  assert.deepEqual(await loadConfig([]), { mode: 'commonjs' });
  process.env.CIRCUS_CONFIG = esm;
  assert.deepEqual(await loadConfig([]), { mode: 'esm' });
});

test('loads TypeScript and merges nested defaults without modifying them', async () => {
  const defaults = join(fixtureDirectory, 'default.mjs');
  const custom = join(fixtureDirectory, 'custom.mts');
  const other = join(fixtureDirectory, 'other.cjs');
  writeFileSync(
    defaults,
    'export default { service: { options: { a: 1, b: 2 } } };'
  );
  writeFileSync(
    custom,
    'const a: number = await Promise.resolve(3); export default { service: { options: { a } } };'
  );
  writeFileSync(other, 'module.exports = {};');

  process.env.CIRCUS_CONFIG = custom;
  assert.deepEqual(await loadConfig([defaults]), {
    service: { options: { a: 3, b: 2 } }
  });
  process.env.CIRCUS_CONFIG = other;
  assert.deepEqual(await loadConfig([defaults]), {
    service: { options: { a: 1, b: 2 } }
  });
});

test('reports missing and invalid config files', async () => {
  const missing = join(fixtureDirectory, 'missing.mjs');
  process.env.CIRCUS_CONFIG = missing;
  await assert.rejects(loadConfig([defaultPath]), (error: unknown) => {
    assert(error instanceof ConfigLoadError);
    assert.equal(
      error.message,
      `Could not load configuration file ${missing} (file not found)`
    );
    assert(error.cause instanceof Error);
    assert.equal(
      (error.cause as NodeJS.ErrnoException).code,
      'ERR_MODULE_NOT_FOUND'
    );
    return true;
  });

  const invalid = join(fixtureDirectory, 'invalid.mjs');
  writeFileSync(invalid, 'export default [];');
  process.env.CIRCUS_CONFIG = invalid;
  await assert.rejects(loadConfig([defaultPath]), {
    message: `Configuration file ${invalid} must export an object`
  });

  process.env.CIRCUS_CONFIG = '';
  await assert.rejects(loadConfig([defaultPath]), ConfigLoadError);
});

test('keeps the underlying cause when a config dependency is missing', async () => {
  const config = join(fixtureDirectory, 'missing-dependency.cjs');
  writeFileSync(config, 'module.exports = require("./absent-helper.cjs");');
  process.env.CIRCUS_CONFIG = config;
  await assert.rejects(loadConfig([]), (error: unknown) => {
    assert(error instanceof ConfigLoadError);
    assert.equal(
      error.message,
      `Could not load configuration file ${config} (a dependency was not found)`
    );
    assert(error.cause instanceof Error);
    assert.match(error.cause.message, /absent-helper\.cjs/);
    return true;
  });
});
