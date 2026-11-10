import { it, before, after } from 'node:test';
import { expect } from 'expect';
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
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
});

it('should return a filtered queue list', async () => {
  const res = await axios.get('api/admin/plugin-job-queue?state=wait');
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(0);
});
