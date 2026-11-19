import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runAdminCli, writeAdminCliConfig } from '../test/util-admin-cli.ts';

test('lists the admin commands and supports both forms of command help', () => {
  const root = runAdminCli([]);
  assert.equal(root.status, 0);
  assert.equal(root.stderr, '');
  assert.match(root.stdout, /^Usage: circus /);
  const commands = root.stdout.split('Commands:\n')[1];
  assert.ok(commands);
  assert.deepEqual(
    Array.from(commands.matchAll(/^ {2}(\S+)/gm), match => match[1]),
    [
      'add-permanent-token',
      'clear-token',
      'db-check',
      'dump-dicom',
      'generate-password-hash',
      'migrate',
      'refresh-series-parameters',
      'register-cad-plugin',
      'ulid',
      'help'
    ]
  );
  assert.deepEqual(runAdminCli(['--help']), root);

  const leaf = runAdminCli(['db-check', '--help']);
  assert.equal(leaf.status, 0);
  assert.equal(leaf.stderr, '');
  assert.match(leaf.stdout, /-t, --target <model>/);
  assert.match(leaf.stdout, /--documents-only/);
  assert.match(leaf.stdout, /--attributes-only/);
  assert.deepEqual(runAdminCli(['help', 'db-check']), leaf);
});

test('prints the version without loading the configuration', () => {
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(runAdminCli(['--version']), {
    status: 0,
    stdout: `${version}\n`,
    stderr: ''
  });
});

test('rejects invalid arguments before loading the configuration', () => {
  const cases = [
    [['unknown-command'], /unknown command 'unknown-command'/],
    [['db-check', '--unknown'], /unknown option '--unknown'/],
    [['db-check', '-t'], /option '-t, --target <model>' argument missing/],
    [
      ['refresh-series-parameters', '--maxDate', 'garbage'],
      /Enter a valid date for --maxDate\./
    ],
    [['dump-dicom'], /missing required argument 'file'/],
    [['register-cad-plugin', 'first', 'second'], /too many arguments/]
  ] as const;
  for (const [args, message] of cases) {
    const { status, stdout, stderr } = runAdminCli([...args]);
    assert.equal(status, 1);
    assert.equal(stdout, '');
    assert.match(stderr, message);
  }
});

test('points users of the retired admin commands to circus-cli', () => {
  for (const [name, replacement] of [
    ['export-case', 'case export'],
    ['import-series', 'series import'],
    ['register-case', 'case create'],
    ['register-plugin-job', 'job create']
  ]) {
    assert.deepEqual(runAdminCli([name]), {
      status: 1,
      stdout: '',
      stderr: `'circus ${name}' has been removed. Use 'circus-cli ${replacement}'.\n`
    });
  }
  assert.deepEqual(runAdminCli(['help', 'export-case']), {
    status: 1,
    stdout: '',
    stderr:
      "'circus export-case' has been removed. Use 'circus-cli case export'.\n"
  });
});

test('exits with 1 if the configuration cannot be loaded', () => {
  const { status, stdout, stderr } = runAdminCli(['ulid']);
  assert.equal(status, 1);
  assert.equal(stdout, '');
  assert.equal(
    stderr,
    'ERROR:\nCIRCUS_CONFIG must specify a configuration file\n'
  );
});

test('reports service initialization failures without an unhandled rejection', async t => {
  const configPath = await writeAdminCliConfig(
    t,
    'export default { database: { options: { mongoUrl: "invalid" } } };\n'
  );
  const { status, stdout, stderr } = runAdminCli(
    ['db-check', '-t', 'user'],
    configPath
  );
  assert.equal(status, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /^ERROR:\nMongoParseError: Invalid scheme/);
  assert.match(stderr, /^ {4}at /m);
  assert.equal([...stderr.matchAll(/Invalid scheme/g)].length, 1, stderr);
});
