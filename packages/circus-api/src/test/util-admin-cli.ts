import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const entry = fileURLToPath(new URL('../../circus.ts', import.meta.url));

export const runAdminCli = (args: string[], configPath = '') => {
  const result = spawnSync(process.execPath, [entry, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CIRCUS_CONFIG: configPath },
    timeout: 5000
  });
  assert.ifError(result.error);
  return {
    status: result.status,
    stdout: stripVTControlCharacters(result.stdout),
    stderr: stripVTControlCharacters(result.stderr)
  };
};

export const writeAdminCliConfig = async (t: TestContext, source: string) => {
  const dir = await mkdtemp(join(tmpdir(), 'circus-admin-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = join(dir, 'circus.config.mjs');
  await writeFile(configPath, source);
  return configPath;
};

export const adminCliMongoConfig = (t: TestContext) => {
  assert.ok(process.env.CIRCUS_MONGO_TEST_URL);
  return writeAdminCliConfig(
    t,
    'export default { database: { options: { mongoUrl: process.env.CIRCUS_MONGO_TEST_URL } } };\n'
  );
};
