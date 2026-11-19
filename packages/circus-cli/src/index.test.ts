import assert from 'node:assert/strict';
import { runCli } from '@utrad-ical/circus-lib/test/cli';
import { test } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

const entry = new URL('./index.ts', import.meta.url);
const run = async (...args: string[]) => {
  const { code, stdout, stderr } = await runCli(entry, args);
  return {
    code,
    stdout: stripVTControlCharacters(stdout),
    stderr: stripVTControlCharacters(stderr)
  };
};

const commandNames = (help: string) =>
  Array.from(help.matchAll(/^ {2}([a-z]+)\b/gm), match => match[1]).filter(
    name => name !== 'help'
  );

test('shows group, subcommand, and leaf help', async () => {
  const groups = {
    api: ['get', 'post', 'put', 'patch'],
    auth: ['login', 'logout', 'status'],
    case: ['create', 'addrev', 'export'],
    job: ['create'],
    series: ['import', 'export'],
    blob: ['get', 'post'],
    mylist: ['show']
  };
  const root = await run('--help');
  assert.equal(root.code, 0);
  assert.deepEqual(
    commandNames(root.stdout).sort(),
    Object.keys(groups).sort()
  );

  for (const [name, commands] of Object.entries(groups)) {
    const group = await run(name, '--help');
    assert.equal(group.code, 0);
    assert.deepEqual(commandNames(group.stdout).sort(), commands.sort(), name);
  }

  const leaf = await run('case', 'create', '--help');
  assert.equal(leaf.code, 0);
  assert.match(leaf.stdout, /^Usage: circus-cli case create /);
  assert.match(leaf.stdout, /--project <id-or-name>/);
});

test('requires a subcommand and rejects the old flat syntax', async () => {
  const group = await run('auth');
  assert.equal(group.code, 1);
  assert.match(group.stderr, /^\s+login\s/m);
  assert.match(group.stderr, /^\s+logout\s/m);

  for (const args of [['case-create'], ['get'], ['auth', '--logout']]) {
    const result = await run(...args);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /error: unknown (?:command|option)/);
  }
});
