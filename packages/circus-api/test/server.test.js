import createApp from '../src/createApp';
import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';

describe('Basic server behavior', function() {
  let server, db, dbConnection;

  before(async function() {
    ({ db, dbConnection } = await test.connectMongo());
    const koaApp = await createApp({
      debug: true,
      fixUser: 'alice@example.com',
      db
    });
    server = await test.listenKoa(koaApp);
  });

  after(async function() {
    if (server) await test.tearDownKoa(server);
    if (dbConnection) await dbConnection.close();
  });

  it('should return server status', async function() {
    const result = await axios.get(server.url + 'api/status');
    assert.equal(result.status, 200);
    assert.equal(result.data.status, 'running');
  });

  it('should return 404 for root path', async function() {
    const res = await axios.get(server.url, { validateStatus: null });
    assert.equal(res.status, 404);
  });

  it('should return 400 for malformed JSON input', async function() {
    const res = await axios.request({
      method: 'post',
      url: server.url + 'api/echo',
      data: {},
      headers: { 'Content-Type': 'application/json' },
      transformRequest: [() => '{I+am+not.a.valid-JSON}}'],
      validateStatus: null
    });
    assert.equal(res.status, 400);
  });

  it('should return 415 if content type is not set to JSON', async function() {
    const res = await axios.request({
      method: 'post',
      url: server.url + 'api/echo',
      headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
      data: 'testdata',
      validateStatus: null
    });
    assert.equal(res.status, 415); // Unsupported media type
  });

  it('should return 400 for huge JSON > 1mb', async function() {
    const bigData = { foo: 'A'.repeat(1024 * 1024) };
    await test.asyncThrows(
      axios.request({
        method: 'post',
        url: server.url + 'echo',
        data: bigData
      })
    );
  });

  describe('Echo', function() {
    it('should return input data as-is', async function() {
      const data = { a: 10, b: 'test', c: { d: 999, e: 'TEST' } };
      const res = await axios.post(server.url + 'api/echo', data);
      assert.deepEqual(res.data, data);
    });
  });
});
