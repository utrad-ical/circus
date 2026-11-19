import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tempDirectory } from '../test/command.ts';

test('sends requests from the real CLI and preserves piped input, output, and exit codes', async t => {
  const requests: {
    method: string | undefined;
    url: string | undefined;
    authorization: string | undefined;
    body: string;
  }[] = [];
  const rawJson = '{"fixture":true}\n';
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
  await writeFile(
    join(directory, '.circusapirc'),
    `CIRCUS_API_ENDPOINT=${endpoint}\nCIRCUS_API_TOKEN=test-token\n`
  );
  const entry = fileURLToPath(new URL('../index.ts', import.meta.url));
  // Point the subprocess at the test settings without changing the user's environment.
  const preload =
    'data:text/javascript,' +
    encodeURIComponent(`
    import os from 'node:os';
    import { syncBuiltinESMExports } from 'node:module';
    os.homedir = () => process.env.CIRCUS_CLI_TEST_SETTINGS_DIR;
    syncBuiltinESMExports();
  `);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CIRCUS_CLI_TEST_SETTINGS_DIR: directory
  };
  delete env.CIRCUS_API_ENDPOINT;
  delete env.CIRCUS_API_TOKEN;

  const run = async (args: string[], stdin?: string) => {
    const child = spawn(
      process.execPath,
      ['--import', preload, entry, 'api', ...args],
      {
        env,
        timeout: 5000
      }
    );
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
    'get',
    '--no-pretty',
    'fixture',
    '--query',
    'page=2'
  ]);
  assert.equal(read.code, 0, read.stderr);
  assert.equal(read.stdout, rawJson);

  for (const method of ['post', 'put', 'patch']) {
    const result = await run([method, 'fixture'], '{"name":"fixture"}');
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Request finished successfully/);
    assert.match(result.stdout, /"fixture": true/);
  }

  const failure = await run(['get', '--no-pretty', 'unavailable']);
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
});
