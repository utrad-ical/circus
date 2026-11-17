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

it("should return only the current user's jobs", async () => {
  // The queue has one job, which is made Alice's
  await apiTest.database.db
    .collection('pluginJobs')
    .updateOne(
      { jobId: '01dxgwv3k0medrvhdag4mpw9wa' },
      { $set: { userEmail: 'alice@example.com' } }
    );
  const res1 = await axios.get('api/plugin-job-queue');
  assert.equal(res1.status, 200);
  assert.deepEqual(
    res1.data.items.map((j: any) => j.jobId),
    ['01dxgwv3k0medrvhdag4mpw9wa']
  );
  const res2 = await apiTest.axiosInstances.bob.get('api/plugin-job-queue');
  assert.equal(res2.data.items.length, 0);
});
