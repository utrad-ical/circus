import { test, before, after } from 'node:test';
import { expect } from 'expect';
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
  expect(res1.status).toBe(httpStatus.CREATED);
  const tokenId = res1.data.tokenId;

  const res2 = await axios.get('/api/tokens');
  expect(res2.status).toBe(httpStatus.OK);
  expect(res2.data).toMatchObject({ items: [{ description: 'stella' }] });

  const res3 = await axios.delete(`/api/tokens/${tokenId}`);
  expect(res3.status).toBe(httpStatus.NO_CONTENT);
});
