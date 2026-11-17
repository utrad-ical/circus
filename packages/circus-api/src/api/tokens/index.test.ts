import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { AxiosInstance } from 'axios';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

test('Create / search / delete token', async () => {
  const res1 = await axios.post('/api/tokens', { description: 'stella' });
  assert.equal(res1.status, httpStatus.CREATED);
  const tokenId = res1.data.tokenId;

  const res2 = await axios.get('/api/tokens');
  assert.equal(res2.status, httpStatus.OK);
  // partialDeepStrictEqual allows extra array elements, unlike toMatchObject
  assert.equal(res2.data.items.length, 1);
  assert.partialDeepStrictEqual(res2.data, {
    items: [{ description: 'stella' }]
  });

  // Others cannot delete it
  const res3 = await apiTest.axiosInstances.bob.delete(
    `/api/tokens/${tokenId}`
  );
  assert.equal(res3.status, httpStatus.NOT_FOUND);

  const res4 = await axios.delete(`/api/tokens/${tokenId}`);
  assert.equal(res4.status, httpStatus.NO_CONTENT);

  const res5 = await axios.delete(`/api/tokens/${tokenId}`);
  assert.equal(res5.status, httpStatus.NOT_FOUND);
});
