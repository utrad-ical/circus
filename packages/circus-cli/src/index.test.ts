import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const runCli = (...args: string[]) => {
  const entry = fileURLToPath(new URL('./index.ts', import.meta.url));
  const result = spawnSync(process.execPath, [entry, ...args], {
    encoding: 'utf8',
    timeout: 5000
  });
  assert.ifError(result.error);
  return {
    status: result.status,
    stdout: stripVTControlCharacters(result.stdout),
    stderr: stripVTControlCharacters(result.stderr)
  };
};

test('shows group, subcommand, and leaf help', () => {
  const root = runCli('--help');
  assert.equal(root.status, 0);
  assert.match(root.stdout, /^\s+case\s+Create, revise, and export cases/m);

  const group = runCli('case', '--help');
  assert.equal(group.status, 0);
  assert.match(group.stdout, /^\s+create \[options\]/m);

  const leaf = runCli('case', 'create', '--help');
  assert.equal(leaf.status, 0);
  assert.match(leaf.stdout, /^Usage: circus-cli case create /);
  assert.match(leaf.stdout, /--project <id-or-name>/);
});

test('requires a subcommand and rejects the old flat syntax', () => {
  const group = runCli('auth');
  assert.equal(group.status, 1);
  assert.match(group.stderr, /^\s+login\s/m);
  assert.match(group.stderr, /^\s+logout\s/m);

  for (const args of [['case-create'], ['get'], ['auth', '--logout']]) {
    const result = runCli(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: unknown (?:command|option)/);
  }
});
