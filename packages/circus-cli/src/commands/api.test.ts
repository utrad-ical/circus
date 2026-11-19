import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters, styleText } from 'node:util';
import { tempDirectory } from '../test/command.ts';
import { saveCliConnection } from '../utils/cliConfig.ts';

test('sends requests from the real CLI and preserves piped input, output, and exit codes', async t => {
  const requests: {
    method: string | undefined;
    url: string | undefined;
    authorization: string | undefined;
    body: string;
  }[] = [];
  const rawJson = '{"fixture":true}\n';
  const token = 'test-token';
  const rejectedToken = 'rejected-token';
  const unexpectedToken = 'unexpected-response-token';
  const server = createServer(async (req, res) => {
    requests.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      body: await text(req)
    });
    if (req.url === '/api/unavailable') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"error":"Unavailable"}');
      return;
    }
    if (req.url === '/api/login-info/full') {
      if (req.headers.authorization === `Bearer ${rejectedToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rejectedToken }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          req.headers.authorization === `Bearer ${unexpectedToken}`
            ? { loginId: 'operator', unexpectedToken }
            : {
                loginId: 'operator',
                userEmail: 'user@example.test',
                domains: ['research'],
                accessibleProjects: [
                  {
                    projectId: 'project-1',
                    project: { projectName: 'Training' },
                    roles: ['read', 'write']
                  }
                ],
                accessiblePlugins: [
                  {
                    pluginId: 'plugin-1',
                    plugin: { pluginName: 'CAD', version: '1.2.3' },
                    roles: ['execute']
                  }
                ],
                unrelated: token
              }
        )
      );
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(rawJson);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      })
  );
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const directory = await tempDirectory(t);
  const endpoint = `http://127.0.0.1:${address.port}/api/`;
  await saveCliConnection(join(directory, 'circus-cli', 'config.json'), {
    endpoint,
    token
  });
  const entry = fileURLToPath(new URL('../index.ts', import.meta.url));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    XDG_CONFIG_HOME: directory
  };
  delete env.CIRCUS_API_ENDPOINT;
  delete env.CIRCUS_API_TOKEN;
  delete env.FORCE_COLOR;

  const run = async (
    args: string[],
    stdin?: string,
    envOverrides?: NodeJS.ProcessEnv
  ) => {
    const child = spawn(process.execPath, [entry, ...args], {
      env: { ...env, ...envOverrides },
      timeout: 5000
    });
    const closed = once(child, 'close');
    child.stdin.end(stdin);
    const [stdout, stderr, [code]] = await Promise.all([
      text(child.stdout),
      text(child.stderr),
      closed
    ]);
    return { stdout, stderr, code };
  };

  const read = await run([
    'api',
    'get',
    '--no-pretty',
    'fixture',
    '--query',
    'page=2'
  ]);
  assert.equal(read.code, 0, read.stderr);
  assert.equal(read.stdout, rawJson);

  for (const method of ['post', 'put', 'patch']) {
    const result = await run(['api', method, 'fixture'], '{"name":"fixture"}');
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Request finished successfully/);
    assert.match(result.stdout, /"fixture": true/);
  }

  const failure = await run(['api', 'get', '--no-pretty', 'unavailable']);
  assert.equal(failure.code, 1);
  assert.equal(failure.stdout, '');
  assert.match(failure.stderr, /HTTP error: 503/);

  assert.deepEqual(
    requests.map(({ method, url, authorization, body }) => [
      method,
      url,
      authorization,
      body
    ]),
    [
      ['GET', '/api/fixture?page=2', 'Bearer test-token', ''],
      ['POST', '/api/fixture', 'Bearer test-token', '{"name":"fixture"}'],
      ['PUT', '/api/fixture', 'Bearer test-token', '{"name":"fixture"}'],
      ['PATCH', '/api/fixture', 'Bearer test-token', '{"name":"fixture"}'],
      ['GET', '/api/unavailable', 'Bearer test-token', '']
    ]
  );

  await t.test(
    'auth status checks the saved connection and supports plain and colored output',
    async () => {
      const priorRequests = requests.length;
      const [result, colored] = await Promise.all([
        run(['auth', 'status']),
        run(['auth', 'status'], undefined, {
          FORCE_COLOR: '1',
          NO_COLOR: undefined,
          NODE_DISABLE_COLORS: undefined
        })
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(colored.code, 0, colored.stderr);
      assert.equal(colored.stderr, '');
      assert.equal(
        result.stdout,
        [
          `API endpoint: ${endpoint}`,
          'Login ID: operator',
          'Email: user@example.test',
          'Domains:',
          '  - research',
          'Projects:',
          '  - Training (project-1) — read, write',
          'Plug-ins:',
          '  - CAD v1.2.3 (plugin-1) — execute',
          ''
        ].join('\n')
      );
      assert.equal(stripVTControlCharacters(colored.stdout), result.stdout);
      assert.ok(
        colored.stdout.includes(
          styleText(['bold', 'cyan'], 'Projects:', { validateStream: false })
        )
      );
      assert.ok(
        colored.stdout.includes(
          styleText('green', 'read, write', { validateStream: false })
        )
      );
      const expectedRequest = {
        method: 'GET',
        url: '/api/login-info/full',
        authorization: `Bearer ${token}`,
        body: ''
      };
      assert.deepEqual(requests.slice(priorRequests), [
        expectedRequest,
        expectedRequest
      ]);
    }
  );

  await t.test(
    'auth status and logout succeed when there is no saved connection',
    async () => {
      const priorRequests = requests.length;
      const noConfig = { XDG_CONFIG_HOME: join(directory, 'unconfigured') };
      const [status, logout, request] = await Promise.all([
        run(['auth', 'status'], undefined, noConfig),
        run(['auth', 'logout'], undefined, noConfig),
        run(['api', 'get', 'fixture'], undefined, noConfig)
      ]);
      assert.equal(status.code, 0, status.stderr);
      assert.equal(status.stderr, '');
      assert.equal(
        status.stdout,
        'Not logged in. Run "circus-cli auth login" to save a connection.\n'
      );
      assert.equal(logout.code, 0, logout.stderr);
      assert.equal(logout.stderr, '');
      assert.equal(logout.stdout, 'No saved connection to remove.\n');
      assert.equal(request.code, 1);
      assert.match(
        request.stderr,
        /No saved connection found.*Run "circus-cli auth login"/
      );
      assert.equal(requests.length, priorRequests);
    }
  );

  await t.test(
    'auth status reports connection errors without printing credentials or response bodies',
    async () => {
      for (const [token, expectedError] of [
        [rejectedToken, /The API rejected this token \(HTTP 401\)/],
        [unexpectedToken, /Unexpected response from .*\/api\/login-info\/full/]
      ] as const) {
        const result = await run(['auth', 'status'], undefined, {
          CIRCUS_API_ENDPOINT: endpoint,
          CIRCUS_API_TOKEN: token
        });
        assert.equal(result.code, 1);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, expectedError);
        assert.ok(!result.stderr.includes(token));
      }
    }
  );
});
