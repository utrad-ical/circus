import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripVTControlCharacters } from 'node:util';
import { runCli } from '@utrad-ical/circus-lib/test/cli';
import { runAdminCli, writeAdminCliConfig } from '../test/util-admin-cli.ts';

const commandNames = (help: string) => {
  const commands = help.split('Commands:\n')[1];
  assert.ok(commands);
  return Array.from(
    commands.matchAll(/^ {2}(\S+)/gm),
    match => match[1]
  ).filter(name => name !== 'help');
};

test('lists the admin command groups and supports both forms of subcommand help', async () => {
  const root = await runAdminCli([]);
  assert.equal(root.code, 0);
  assert.equal(root.stderr, '');
  assert.match(root.stdout, /^Usage: circus /);
  assert.deepEqual(commandNames(root.stdout), [
    'db',
    'series',
    'plugin',
    'token',
    'util'
  ]);
  assert.deepEqual(await runAdminCli(['--help']), root);

  for (const [group, commands] of Object.entries({
    db: ['check', 'migrate'],
    series: ['refresh-parameters'],
    plugin: ['register'],
    token: ['issue', 'clear'],
    util: ['dump-dicom', 'hash-password', 'ulid']
  })) {
    const result = await runAdminCli([group, '--help']);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');
    assert.deepEqual(commandNames(result.stdout), commands);
  }

  const leaf = await runAdminCli(['db', 'check', '--help']);
  assert.equal(leaf.code, 0);
  assert.equal(leaf.stderr, '');
  assert.match(
    leaf.stdout,
    /^Usage: circus db check \[options\] \[model\.\.\.\]/
  );
  assert.match(leaf.stdout, /--documents-only/);
  assert.match(leaf.stdout, /--attributes-only/);
  assert.deepEqual(await runAdminCli(['db', 'help', 'check']), leaf);
});

test('colors help when enabled and keeps the same text in a pipe', async () => {
  const entry = new URL('../../circus.ts', import.meta.url);
  const env = {
    ...process.env,
    CIRCUS_CONFIG: '',
    NO_COLOR: undefined,
    NODE_DISABLE_COLORS: undefined
  };
  const [plain, colored] = await Promise.all([
    runCli(entry, ['--help'], { env: { ...env, FORCE_COLOR: undefined } }),
    runCli(entry, ['--help'], { env: { ...env, FORCE_COLOR: '1' } })
  ]);
  assert.equal(plain.code, 0);
  assert.equal(colored.code, 0);
  assert.equal(colored.stderr, '');
  assert.notEqual(colored.stdout, plain.stdout);
  assert.equal(stripVTControlCharacters(colored.stdout), plain.stdout);
});

test('prints the version without loading the configuration', async () => {
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(await runAdminCli(['--version']), {
    code: 0,
    stdout: `${version}\n`,
    stderr: ''
  });
});

test('rejects invalid arguments before loading the configuration', async () => {
  const cases = [
    [['unknown-command'], /unknown command 'unknown-command'/],
    [['db', 'check', '--unknown'], /unknown option '--unknown'/],
    [['db', 'check', '-t', 'user'], /unknown option '-t'/],
    [
      ['db', 'check', '--documents-only', '--attributes-only'],
      /option '--documents-only' cannot be used with option '--attributes-only'/
    ],
    [
      ['series', 'refresh-parameters', '--max-date', 'garbage'],
      /Enter a valid date for --max-date\./
    ],
    [['util', 'dump-dicom'], /missing required argument 'file'/],
    [['plugin', 'register', 'first', 'second'], /too many arguments/]
  ] as const;
  for (const [args, message] of cases) {
    const { code, stdout, stderr } = await runAdminCli(args);
    assert.equal(code, 1);
    assert.equal(stdout, '');
    assert.match(stderr, message);
    assert.match(stderr, /\(Use --help for additional information\)/);
  }
});

test('points users of the flat admin commands to the grouped commands', async () => {
  for (const [name, replacement] of [
    ['db-check', 'db check'],
    ['migrate', 'db migrate'],
    ['refresh-series-parameters', 'series refresh-parameters'],
    ['register-cad-plugin', 'plugin register'],
    ['add-permanent-token', 'token issue'],
    ['clear-token', 'token clear'],
    ['dump-dicom', 'util dump-dicom'],
    ['generate-password-hash', 'util hash-password'],
    ['ulid', 'util ulid']
  ]) {
    assert.deepEqual(await runAdminCli([name]), {
      code: 1,
      stdout: '',
      stderr: `'circus ${name}' has been removed. Use 'circus ${replacement}'.\n`
    });
  }
  assert.deepEqual(await runAdminCli(['help', 'db-check']), {
    code: 1,
    stdout: '',
    stderr: "'circus db-check' has been removed. Use 'circus db check'.\n"
  });
});

test('points users of the retired admin commands to circus-cli', async () => {
  for (const [name, replacement] of [
    ['export-case', 'case export'],
    ['import-series', 'series import'],
    ['register-case', 'case create'],
    ['register-plugin-job', 'job create']
  ]) {
    assert.deepEqual(await runAdminCli([name]), {
      code: 1,
      stdout: '',
      stderr: `'circus ${name}' has been removed. Use 'circus-cli ${replacement}'.\n`
    });
  }
  assert.deepEqual(await runAdminCli(['help', 'export-case']), {
    code: 1,
    stdout: '',
    stderr:
      "'circus export-case' has been removed. Use 'circus-cli case export'.\n"
  });
});

test('exits with 1 if the configuration cannot be loaded', async () => {
  const { code, stdout, stderr } = await runAdminCli(['util', 'ulid']);
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.equal(
    stderr,
    'Error\nCIRCUS_CONFIG must specify a configuration file\n'
  );
});

test('reports service initialization failures without an unhandled rejection', async t => {
  const configPath = await writeAdminCliConfig(
    t,
    'export default { database: { options: { mongoUrl: "invalid" } } };\n'
  );
  const { code, stdout, stderr } = await runAdminCli(
    ['db', 'check', 'user'],
    configPath
  );
  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /^Error\nMongoParseError: Invalid scheme/);
  assert.match(stderr, /^ {4}at /m);
  assert.equal([...stderr.matchAll(/Invalid scheme/g)].length, 1, stderr);
});
