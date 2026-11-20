import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { TestHttpClient } from '../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

test("returns only the current user's jobs", async () => {
  // The queue has one job, which is made Alice's
  await apiTest.database.db
    .collection('pluginJobs')
    .updateOne(
      { jobId: '01dxgwv3k0medrvhdag4mpw9wa' },
      { $set: { userEmail: 'alice@example.com' } }
    );
  const res1 = await client.get('api/plugin-job-queue');
  assert.equal(res1.status, 200);
  assert.deepEqual(
    res1.data.items.map((j: any) => j.jobId),
    ['01dxgwv3k0medrvhdag4mpw9wa']
  );
  const res2 = await apiTest.clients.bob.get('api/plugin-job-queue');
  assert.equal(res2.data.items.length, 0);
});

test('rejects invalid query parameters', async () => {
  for (const q of ['limit=0', 'page=x', 'state=foo']) {
    const res = await client.get(`api/plugin-job-queue?${q}`);
    assert.equal(res.status, 400, q);
  }
});
