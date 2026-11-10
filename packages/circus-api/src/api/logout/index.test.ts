import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

test('logout', async () => {
  const res1 = await axios.get('api/logout');
  assert.equal(res1.status, httpStatus.NO_CONTENT);
  const res2 = await axios.get('api/login-info');
  assert.equal(res2.status, httpStatus.UNAUTHORIZED);
});

test('preserve permanent token', async () => {
  const res = await apiTest.axiosInstances.guest.get('api/logout');
  assert.equal(res.status, httpStatus.NO_CONTENT);
  const rows = await apiTest.database.db
    .collection('tokens')
    .find({ userId: 'guest@example.com' })
    .toArray();
  assert.equal(rows.length, 1);
  assert.match(rows[0]?.permanentTokenId, /.{10,}/);
});
