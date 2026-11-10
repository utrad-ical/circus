import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
});

after(async () => await apiTest.tearDown());

beforeEach(async () => {
  axios = apiTest.axiosInstances.alice;
  await setUpMongoFixture(apiTest.database.db, ['onetimeUrls']);
});

test('create a one time URL', async () => {
  const userEmail = 'bob@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 201);
});

test('throw 401 error for unauthorized user', async () => {
  axios = apiTest.axiosInstances.carol;
  const userEmail = 'bob@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 401);
});

test('throw 404 error for nonexistent user', async () => {
  const userEmail = 'nonexistentuser@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 404);
});

test('throw 400 error for login disabled user', async () => {
  const userEmail = 'eve@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 400);
});
