import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { TestHttpClient } from '../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

test("returns the current user's preferences", async () => {
  const res = await client.get('api/preferences');
  assert.equal(res.data.theme, 'mode_white');
});

describe('PATCH', () => {
  test('modify the preference', async () => {
    const res1 = await client.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_black' }
    });
    assert.equal(res1.status, 204);
    const res2 = await client.get('api/preferences');
    assert.equal(res2.data.theme, 'mode_black');
  });

  test('rejects an invalid preference update', async () => {
    const res = await client.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_pink', personalInfoView: false }
    });
    assert.equal(res.status, 400);
  });

  test('rejects a nonexistent preference key', async () => {
    const res = await client.request({
      url: 'api/preferences',
      method: 'patch',
      data: { pineapple: true }
    });
    assert.equal(res.status, 400);
  });

  test('rejects an empty object', async () => {
    const res = await client.request({
      url: 'api/preferences',
      method: 'patch',
      data: {}
    });
    assert.equal(res.status, 400);
  });
});
