import assert from 'node:assert/strict';
import { it, before, after } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import type { TestHttpClient } from '../../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

it('should return the current queue list', async () => {
  const res = await client.get('api/admin/plugin-job-queue');
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 1);
});

it('should return a filtered queue list', async () => {
  const res = await client.get('api/admin/plugin-job-queue?state=wait');
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 0);
});

it('should return the requested page', async () => {
  const res = await client.get('api/admin/plugin-job-queue?limit=1&page=2');
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { items: [], page: 2, totalItems: 1 });
});
