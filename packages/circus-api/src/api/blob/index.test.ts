import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { TestHttpClient } from '../../test/util-http.ts';
import { createGzip, gzipSync } from 'node:zlib';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

test('round-trips a blob through upload and download', async () => {
  const res = await client.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  assert.equal(res.status, 201);
  const res2 = await client.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  assert.equal(res2.data, 'star');
});

test('reads just the bytes of a pooled buffer', async () => {
  const res = await client.get(
    'api/blob/5a616841a4fdd6066ee5c7e2d3118e0963ec1fc6'
  );
  assert.equal(res.status, 200);
  assert.equal(res.data, 'dummy');
});

test('accepts a gzip-compressed blob', async () => {
  const res = await client.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'GZIP'
    },
    data: createGzip().end('star')
  });
  assert.equal(res.status, 201);
  const res2 = await client.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  assert.equal(res2.data, 'star');
});

test('limits gzipped uploads by their decompressed size', async () => {
  const res = await client.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip'
    },
    data: gzipSync(Buffer.alloc(20 * 1024 * 1024 + 1))
  });
  assert.equal(res.status, 413);
  assert.deepEqual(res.data, { error: 'request entity too large' });
});

test('returns 400 on hash mismatch', async () => {
  const res = await client.request({
    method: 'put',
    url: 'api/blob/1111222233334444aaaabbbbcccc',
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  assert.equal(res.status, 400);
});

test('returns 404 for a nonexistent hash', async () => {
  const res = await client.get('api/blob/aaabbbcccdddeeefff111222333');
  assert.equal(res.status, 404);
});
