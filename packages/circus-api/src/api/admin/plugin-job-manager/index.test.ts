import { it, before, after } from 'node:test';
import { expect } from 'expect';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;

before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

const url = 'api/admin/plugin-job-manager';

it('should return the current state of a server', async () => {
  const res = await axios.get(url);
  const status = await apiTest.csCore.daemon.status();
  expect(res.status).toBe(200);
  expect(res.data.status).toBe(status);
});

it('should set the state of a server', async () => {
  const res = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'running' }
  });
  expect(res.status).toBe(200);
  expect(res.data).toEqual({ status: 'running' });
  const res2 = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'stopped' }
  });
  expect(res2.data).toEqual({ status: 'stopped' });
});

it('should throw for invalid status change request', async () => {
  const res = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'going' } // invalid status
  });
  expect(res.status).toBe(400);
});
