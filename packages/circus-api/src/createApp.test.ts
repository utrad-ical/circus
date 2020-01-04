import createApp from './createApp';
import axios, { AxiosInstance } from 'axios';
import mongo from 'mongodb';
import { setUpKoaTestWith, TestServer } from '../test/util-koa';
import { connectMongo } from '../test/util-mongo';

let testServer: TestServer,
  db: mongo.Db,
  dbConnection: mongo.MongoClient,
  ax: AxiosInstance;

beforeAll(async function() {
  ({ db, dbConnection } = await connectMongo());
  const koaApp = await createApp({
    debug: true,
    fixUser: 'alice@example.com',
    db,
    cs: null, // dummy
    pluginResultsPath: '', // dummy
    dicomImageServerUrl: '' // dummy
  });
  testServer = await setUpKoaTestWith(koaApp);
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

afterAll(async function() {
  await testServer.tearDown();
  await dbConnection.close();
});

it('should return server status', async function() {
  const result = await ax.get('api/status');
  expect(result.status).toBe(200);
  expect(result.data.status).toBe('running');
});

it('should return 404 for root path', async function() {
  const res = await ax.get('');
  expect(res.status).toBe(404);
});

it('should return 400 for malformed JSON input', async function() {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    data: {},
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [() => '{I+am+not.a.valid-JSON}}']
  });
  expect(res.status).toBe(400);
});

it('should return 415 if content type is not set to JSON', async function() {
  const res = await ax.request({
    method: 'post',
    url: 'api/echo',
    headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
    data: 'testdata'
  });
  expect(res.status).toBe(415); // Unsupported media type
});

it('should return 400 for huge JSON > 1mb', async function() {
  const bigData = { foo: 'A'.repeat(1024 * 1024) };
  const res = await ax.post('api/echo', { data: bigData });
  expect(res.status).toBe(400);
});

describe('Echo', function() {
  it('should return input data as-is', async function() {
    const data = { a: 10, b: 'test', c: { d: 999, e: 'TEST' } };
    const res = await axios.post(testServer.url + 'api/echo', data);
    expect(res.data).toEqual(data);
  });
});
