import { describe, test, before, after } from 'node:test';
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

test('return the preference of the current user', async () => {
  const res = await axios.get('api/preferences');
  expect(res.data.theme).toBe('mode_white');
});

describe('PATCH', () => {
  test('modify the preference', async () => {
    const res1 = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_black' }
    });
    expect(res1.status).toBe(204);
    const res2 = await axios.get('api/preferences');
    expect(res2.data.theme).toBe('mode_black');
  });

  test('reject invalid preference update', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_pink', personalInfoView: false }
    });
    expect(res.status).toBe(400);
  });

  test('reject nonexistent preference key', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { pineapple: true }
    });
    expect(res.status).toBe(400);
  });

  test('reject empty object', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: {}
    });
    expect(res.status).toBe(400);
  });
});
