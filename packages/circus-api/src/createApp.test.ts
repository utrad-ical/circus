import axios, { AxiosInstance } from 'axios';
import { setUpKoaTestWith, TestServer } from '../test/util-koa';
import createTestLogger from '../test/util-logger';
import { usingModels } from '../test/util-mongo';
import createApp from './createApp';

let testServer: TestServer, ax: AxiosInstance;

const modelsPromise = usingModels();

beforeAll(async () => {
  const { db, validator, models } = await modelsPromise;
  const apiLogger = await createTestLogger();
  const koaApp = await createApp(
    {
      debug: true,
      fixUser: 'alice@example.com',
      uploadFileSizeMaxBytes: 200 * 1024 * 1024,
      pluginResultsPath: '', // dummy
      dicomImageServerUrl: '' // dummy
    },
    {
      validator,
      db,
      models,
      apiLogger,
      blobStorage: null as any, // dummy
      dicomImporter: null as any,
      rsRoutes: async () => {},
      volumeProvider: null as any, // dummy
      core: null as any // dummy
    }
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
