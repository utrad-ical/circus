import assert from 'node:assert/strict';
import { it, before, after } from 'node:test';
import type { TestHttpClient } from './test/util-http.ts';
import { createTestHttpClient } from './test/util-http.ts';
import type { TestServer } from './test/util-server.ts';
import { setUpTestServer } from './test/util-server.ts';
import createTestLogger from './test/util-logger.ts';
import { setUpMongoFixture, usingModels } from './test/util-mongo.ts';
import createApp from './createApp.ts';
import { createHonoApp } from './createHonoApp.ts';
import * as ws from 'ws';

let testServer: TestServer, ax: TestHttpClient;

const modelsPromise = usingModels();

before(async () => {
  const { database, validator, models } = await modelsPromise;
  // `fixUser` below must exist
  await setUpMongoFixture(database.db, [
    'users',
    'groups',
    'projects',
    'pluginDefinitions'
  ]);
  const apiLogger = await createTestLogger();
  const server = await createApp(
    {
      debug: true,
      fixUser: 'alice@example.com',
      uploadFileSizeMaxBytes: 200 * 1024 * 1024,
      pluginResultsPath: '', // dummy
      dicomImageServerUrl: '', // dummy
      pluginCachePath: '' // dummy
    },
    {
      validator,
      database,
      models,
      apiLogger,
      dicomFileRepository: null as any, // dummy
      dicomTagReader: null as any, // dummy
      seriesOrientationResolver: null as any, // dummy
      blobStorage: null as any, // dummy
      dicomImporter: null as any,
      rsSeriesRoutes: async () => {},
      volumeProvider: null as any, // dummy
      progressManager: null as any, // dummy
      mhdPacker: null as any, // dummy
      core: null as any, // dummy
      dicomVoxelDumper: null as any, // dummy
      verifyUser: async () => null,
      transactionManager: null as any, // dummy
      rsWSServer: new ws.WebSocketServer({
        noServer: true,
        skipUTF8Validation: true
      }),
      rsWebsocketVolumeConnectionHandlerCreator: () => {
        return null as any; // dummy
      }
    }
  );

  testServer = await setUpTestServer(server);
  ax = createTestHttpClient(testServer.url);
});

after(async () => {
  await testServer.tearDown();
});

it('should return 404 for root path', async () => {
  const res = await ax.get('');
  assert.equal(res.status, 404);
});

it('matches API paths case-sensitively', async () => {
  assert.equal((await ax.get('api/status')).status, 200);
  assert.equal((await ax.get('api/Status')).status, 404);
});

it('should return 404 for the retired token endpoint', async () => {
  const res = await ax.post(
    '/login',
    new URLSearchParams({ grant_type: 'password' })
  );
  assert.equal(res.status, 404);
});

it('should return 400 for malformed JSON input', async () => {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    data: '{I+am+not.a.valid-JSON}}',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(res.status, 400);
});

it('should return 415 if content type is not set to JSON', async () => {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
    data: 'testdata'
  });
  assert.equal(res.status, 415); // Unsupported media type
});

it('should return 400 for huge JSON > 1mb', async () => {
  const bigData = { foo: 'A'.repeat(1024 * 1024) };
  const res = await ax.post('api/echo', { data: bigData });
  assert.equal(res.status, 400);
});

it('should return input data as-is', async () => {
  const data = { a: 10, b: 'test', c: { d: 999, e: 'TEST' } };
  const res = await ax.post('api/echo', data);
  assert.deepEqual(res.data, data);
});

it('cancels response streams on HEAD', async () => {
  const app = createHonoApp({ logger: await createTestLogger() });
  let cancelled = false;
  app.get('/api/stream', ctx =>
    ctx.body(
      new ReadableStream({
        cancel() {
          cancelled = true;
        }
      })
    )
  );

  const response = await app.request('/api/stream', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.body, null);
  assert.equal(cancelled, true);
});
