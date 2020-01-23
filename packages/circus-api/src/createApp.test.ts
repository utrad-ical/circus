import axios, { AxiosInstance } from 'axios';
import { setUpKoaTestWith, TestServer } from '../test/util-koa';
import { usingMongo } from '../test/util-mongo';
import { createKoa } from './createApp';
import createValidator from './createValidator';
import createModels from './db/createModels';
import createTestLogger from '../test/util-logger';

let testServer: TestServer, ax: AxiosInstance;

const dbPromise = usingMongo();

beforeAll(async () => {
  const db = await dbPromise;
  const validator = await createValidator(undefined);
  const models = await createModels(undefined, { db, validator });
  const logger = await createTestLogger();

  const koaApp = await createKoa(
    {
      validator,
      db,
      models,
      logger,
      volumeProvider: null as any, // dummy
      blobStorage: null as any, // dummy
      uploadFileSizeMax: '200mb',
      cs: null as any, // dummy
      pluginResultsPath: '', // dummy
      dicomImageServerUrl: '' // dummy
    },
    { debug: true, fixUser: 'alice@example.com' },
    async (ctx, next) => {} // dummy
  );
  testServer = await setUpKoaTestWith(koaApp);
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

afterAll(async () => {
  await testServer.tearDown();
});

it('should return server status', async () => {
  const result = await ax.get('api/status');
  expect(result.status).toBe(200);
  expect(result.data.status).toBe('running');
});

it('should return 404 for root path', async () => {
  const res = await ax.get('');
  expect(res.status).toBe(404);
});

it('should return 400 for malformed JSON input', async () => {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    data: {},
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [() => '{I+am+not.a.valid-JSON}}']
  });
  expect(res.status).toBe(400);
});

it('should return 415 if content type is not set to JSON', async () => {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
    data: 'testdata'
  });
  expect(res.status).toBe(415); // Unsupported media type
});

it('should return 400 for huge JSON > 1mb', async () => {
  const bigData = { foo: 'A'.repeat(1024 * 1024) };
  const res = await ax.post('api/echo', { data: bigData });
  expect(res.status).toBe(400);
});

it('should return input data as-is', async () => {
  const data = { a: 10, b: 'test', c: { d: 999, e: 'TEST' } };
  const res = await axios.post(testServer.url + 'api/echo', data);
  expect(res.data).toEqual(data);
});
