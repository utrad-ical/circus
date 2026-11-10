import assert from 'node:assert/strict';
import { it, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';
import { createGzip } from 'zlib';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

it('should accept uploading and downloading a blob', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  assert.equal(res.status, 201);
  const res2 = await axios.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  assert.equal(res2.data, 'star');
});

it('should accept gzipped data', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip'
    },
    data: createGzip().end('star')
  });
  assert.equal(res.status, 201);
  const res2 = await axios.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  assert.equal(res2.data, 'star');
});

it('should return 400 on hash mismatch', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/1111222233334444aaaabbbbcccc',
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  assert.equal(res.status, 400);
});

it('should return 404 for nonexistent hash', async () => {
  const res = await axios.get('api/blob/aaabbbcccdddeeefff111222333');
  assert.equal(res.status, 404);
});
