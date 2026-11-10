import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.bob;
});
after(async () => await apiTest.tearDown());

test('short', async () => {
  const res = await axios.get('api/login-info');
  assert.deepEqual(res.data, {
    userEmail: 'bob@example.com',
    loginId: 'bob'
  });
});

test('full', async () => {
  const res = await axios.get('api/login-info/full');
  assert.partialDeepStrictEqual(res.data, {
    userEmail: 'bob@example.com',
    loginId: 'bob',
    description: 'Bob'
  });
  assert.equal(res.data.sharedMyLists.length, 1);
});
