import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { commandDeps, runCommand, tempDirectory } from '../test/command.ts';
import loginArgs from './auth-login.args.ts';
import login from './auth-login.ts';
import logoutArgs from './auth-logout.args.ts';
import logout from './auth-logout.ts';

const endpoint = 'https://example.test/circus/api/';
const fakeToken = 'test-token';
const existingConfig =
  JSON.stringify({
    formatVersion: 1,
    profiles: [{ name: 'default', endpoint, token: 'previous-token' }]
  }) + '\n';

test('validates the endpoint and key before replacing saved settings', async t => {
  t.mock.method(console, 'log', () => {});
  const configPath = join(await tempDirectory(t), 'config.json');
  await writeFile(configPath, existingConfig);
  const requests = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      switch (String(url)) {
        case 'https://example.test/wrong/status':
          assert.equal(headers.has('Authorization'), false);
          return new Response('<html></html>');
        case 'https://example.test/missing/status':
          assert.equal(headers.has('Authorization'), false);
          return new Response(null, { status: 404 });
        case endpoint + 'status':
          assert.equal(headers.has('Authorization'), false);
          return Response.json({ status: 'running' });
        case endpoint + 'login-info':
          return headers.get('Authorization') === `Bearer ${fakeToken}`
            ? Response.json({
                loginId: 'fixture',
                userEmail: 'user@example.test'
              })
            : new Response(null, { status: 401 });
        default:
          return assert.fail('Unexpected request');
      }
    }
  );
  const deps = commandDeps({
    configPath,
    prompts: {
      confirm: async ({ default: answer }) => {
        assert.equal(answer, false);
        return true;
      },
      input: async ({ validate }) => {
        assert.ok(validate);
        assert.match(String(await validate('invalid/')), /HTTP or HTTPS/);
        assert.equal(requests.mock.callCount(), 0);
        assert.equal(
          await validate('https://example.test/wrong/'),
          'Unexpected response (HTTP 200) from https://example.test/wrong/status. This is not a valid API endpoint.'
        );
        assert.equal(
          await validate('https://example.test/missing/'),
          'Unexpected response (HTTP 404) from https://example.test/missing/status.'
        );
        assert.equal(await validate(endpoint), true);
        return endpoint;
      },
      password: async ({ mask, validate }) => {
        assert.equal(mask, true);
        assert.ok(validate);
        assert.equal(requests.mock.callCount(), 3);
        assert.equal(
          await validate('wrong-token'),
          'The API rejected this token (HTTP 401).'
        );
        assert.equal(await readFile(configPath, 'utf8'), existingConfig);
        assert.equal(await validate(fakeToken), true);
        assert.equal(await readFile(configPath, 'utf8'), existingConfig);
        return fakeToken;
      }
    }
  });

  await runCommand('auth', loginArgs, login, [], deps);

  assert.equal(requests.mock.callCount(), 5);
  const saved = await readFile(configPath, 'utf8');
  assert.deepEqual(JSON.parse(saved), {
    formatVersion: 1,
    profiles: [{ name: 'default', endpoint, token: fakeToken }]
  });
  if (process.platform !== 'win32') {
    assert.equal((await stat(configPath)).mode & 0o777, 0o600);
  }
});

test('keeps saved settings when login is canceled after a failed endpoint check', async t => {
  t.mock.method(console, 'log', () => {});
  const configPath = join(await tempDirectory(t), 'config.json');
  await writeFile(configPath, existingConfig);
  t.mock.method(globalThis, 'fetch', async () => {
    throw new DOMException('Timed out', 'TimeoutError');
  });
  const canceled = new Error('Prompt canceled');
  const deps = commandDeps({
    configPath,
    prompts: {
      confirm: async () => true,
      input: async ({ validate }) => {
        assert.ok(validate);
        assert.equal(
          await validate(endpoint),
          `Request to ${endpoint}status timed out.`
        );
        throw canceled;
      }
    }
  });

  await assert.rejects(
    runCommand('auth', loginArgs, login, [], deps),
    canceled
  );
  assert.equal(await readFile(configPath, 'utf8'), existingConfig);
});

test('removes saved settings only after logout is confirmed', async t => {
  t.mock.method(console, 'log', () => {});
  const configPath = join(await tempDirectory(t), 'config.json');
  await writeFile(configPath, existingConfig);
  const run = (confirmed: boolean) =>
    runCommand(
      'auth',
      logoutArgs,
      logout,
      [],
      commandDeps({
        configPath,
        prompts: { confirm: async () => confirmed }
      })
    );

  await run(false);
  assert.equal(await readFile(configPath, 'utf8'), existingConfig);
  await run(true);
  await assert.rejects(stat(configPath), { code: 'ENOENT' });
});
