import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
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
  assert.equal(res.data.theme, 'mode_white');
});

describe('PATCH', () => {
  test('modify the preference', async () => {
    const res1 = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_black' }
    });
    assert.equal(res1.status, 204);
    const res2 = await axios.get('api/preferences');
    assert.equal(res2.data.theme, 'mode_black');
  });

  test('reject invalid preference update', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_pink', personalInfoView: false }
    });
    assert.equal(res.status, 400);
  });

  test('reject nonexistent preference key', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { pineapple: true }
    });
    assert.equal(res.status, 400);
  });

  test('reject empty object', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: {}
    });
    assert.equal(res.status, 400);
  });
});
