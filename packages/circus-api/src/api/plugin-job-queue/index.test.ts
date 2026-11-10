import assert from 'node:assert/strict';
import { it, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

it('should return the current queue list', async () => {
  const res = await axios.get('api/admin/plugin-job-queue');
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 1);
});

it('should return a filtered queue list', async () => {
  const res = await axios.get('api/admin/plugin-job-queue?state=wait');
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 0);
});
