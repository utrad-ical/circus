import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { tempDirectory } from '../test/command.ts';
import {
  getConfigPath,
  loadCliConnection,
  saveCliConnection
} from './cliConfig.ts';

const endpoint = 'https://example.test/circus/api/';
const token = 'fixture-token';
const profile = { endpoint, token, name: 'default' };

test('resolves CLI config paths using platform defaults and an absolute XDG_CONFIG_HOME', () => {
  assert.equal(
    getConfigPath('/home/user', { XDG_CONFIG_HOME: '/settings' }, 'linux'),
    '/settings/circus-cli/config.json'
  );
  assert.equal(
    getConfigPath('/home/user', { XDG_CONFIG_HOME: 'settings' }, 'linux'),
    '/home/user/.config/circus-cli/config.json'
  );
  assert.equal(
    getConfigPath('/Users/user', {}, 'darwin'),
    '/Users/user/.config/circus-cli/config.json'
  );
  assert.equal(
    getConfigPath('C:\\Users\\user', { APPDATA: 'D:\\Roaming' }, 'win32'),
    'D:\\Roaming\\circus-cli\\config.json'
  );
  assert.equal(
    getConfigPath('C:\\Users\\user', { APPDATA: 'relative' }, 'win32'),
    'C:\\Users\\user\\AppData\\Roaming\\circus-cli\\config.json'
  );
  assert.equal(
    getConfigPath(
      'C:\\Users\\user',
      { XDG_CONFIG_HOME: 'D:\\Settings', APPDATA: 'D:\\Roaming' },
      'win32'
    ),
    'D:\\Settings\\circus-cli\\config.json'
  );
});

test('writes and reads a private JSON config and preserves the old file if replacement fails', async t => {
  const path = join(await tempDirectory(t), 'circus-cli', 'config.json');
  assert.equal(loadCliConnection(path, {}), undefined);

  await saveCliConnection(path, { endpoint, token });
  const saved = await fs.readFile(path, 'utf8');
  assert.deepEqual(JSON.parse(saved), {
    formatVersion: 1,
    profiles: [profile]
  });
  assert.ok(saved.endsWith('\n'));
  assert.deepEqual(loadCliConnection(path, {}), { endpoint, token });
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(dirname(path))).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path)).mode & 0o777, 0o600);
  }

  const renameError = new Error('Could not replace config file');
  t.mock.method(fs, 'rename', async () => {
    throw renameError;
  });
  await assert.rejects(
    saveCliConnection(path, { endpoint, token: 'replacement-token' }),
    renameError
  );
  assert.equal(await fs.readFile(path, 'utf8'), saved);
  assert.deepEqual(await fs.readdir(dirname(path)), ['config.json']);
});

test('rejects unsupported and malformed saved connections without exposing credentials', async t => {
  const path = join(await tempDirectory(t), 'config.json');
  const cases = [
    { contents: `{"token": "${token}"`, error: /Invalid JSON/ },
    {
      contents: JSON.stringify({ formatVersion: 2, profiles: [profile] }),
      error: /Unsupported configuration format version/
    },
    ...[
      [profile],
      { profiles: [profile] },
      { formatVersion: 1, profiles: [] },
      { formatVersion: 1, profiles: [profile, profile] },
      { formatVersion: 1, profiles: [{ ...profile, name: 'other' }] },
      {
        formatVersion: 1,
        profiles: [{ ...profile, endpoint: 'file:///tmp/' }]
      },
      { formatVersion: 1, profiles: [{ ...profile, token: token + '\n' }] }
    ].map(data => ({
      contents: JSON.stringify(data),
      error: /Invalid connection settings/
    }))
  ];
  for (const { contents, error } of cases) {
    await fs.writeFile(path, contents);
    assert.throws(
      () => loadCliConnection(path, {}),
      (actual: Error) => {
        assert.match(actual.message, error);
        assert.ok(!actual.message.includes(token));
        return true;
      }
    );
  }
});

test('uses a complete environment connection and never fills in a missing value from disk', async t => {
  const path = join(await tempDirectory(t), 'config.json');
  await saveCliConnection(path, { endpoint, token });
  const env = {
    CIRCUS_API_ENDPOINT: 'https://ENV.EXAMPLE.test/api/',
    CIRCUS_API_TOKEN: 'env-token'
  };
  for (const partial of [
    { CIRCUS_API_ENDPOINT: env.CIRCUS_API_ENDPOINT },
    { CIRCUS_API_TOKEN: env.CIRCUS_API_TOKEN },
    { ...env, CIRCUS_API_TOKEN: '' }
  ]) {
    assert.throws(() => loadCliConnection(path, partial), /Set both/);
  }
  await fs.writeFile(path, 'invalid JSON');
  assert.deepEqual(loadCliConnection(path, env), {
    endpoint: 'https://env.example.test/api/',
    token: 'env-token'
  });
  assert.throws(
    () => loadCliConnection(path, { ...env, CIRCUS_API_ENDPOINT: 'not a URL' }),
    /Check CIRCUS_API_ENDPOINT/
  );
});
