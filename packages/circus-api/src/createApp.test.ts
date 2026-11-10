import assert from 'node:assert/strict';
import { it, before, after } from 'node:test';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { TestServer } from './test/util-koa.ts';
import { setUpKoaTestWith } from './test/util-koa.ts';
import createTestLogger from './test/util-logger.ts';
import { usingModels } from './test/util-mongo.ts';
import createApp from './createApp.ts';
import * as ws from 'ws';

let testServer: TestServer, ax: AxiosInstance;

const modelsPromise = usingModels();

before(async () => {
  const { database, validator, models } = await modelsPromise;
  const apiLogger = await createTestLogger();
  const koaApp = await createApp(
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
      taskManager: null as any, // dummy
      mhdPacker: null as any, // dummy
      core: null as any, // dummy
      dicomVoxelDumper: null as any, // dummy
      oauthServer: {
        authenticate: () => async (ctx: any, next: any) => {
          next();
        },
        token: () => () => {}
      } as any,
      transactionManager: null as any, // dummy
      rsWSServer: new ws.Server({
        noServer: true,
        skipUTF8Validation: true
      }),
      rsWebsocketVolumeConnectionHandlerCreator: () => {
        return null as any; // dummy
      }
    }
  );

  testServer = await setUpKoaTestWith(koaApp);
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

after(async () => {
  await testServer.tearDown();
});

it('should return 404 for root path', async () => {
  const res = await ax.get('');
  assert.equal(res.status, 404);
});

it('should return 400 for malformed JSON input', async () => {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    data: {},
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [() => '{I+am+not.a.valid-JSON}}']
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
  const res = await axios.post(testServer.url + 'api/echo', data);
  assert.deepEqual(res.data, data);
});
