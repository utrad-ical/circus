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

const url = 'api/admin/plugin-job-manager';

it('should return the current state of a server', async () => {
  const res = await client.get(url);
  const status = await apiTest.csCore.daemon.status();
  assert.equal(res.status, 200);
  assert.equal(res.data.status, status);
});

it('should set the state of a server', async () => {
  const res = await client.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'running' }
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { status: 'running' });
  const res2 = await client.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'stopped' }
  });
  assert.deepEqual(res2.data, { status: 'stopped' });
});

it('should throw for invalid status change request', async () => {
  const res = await client.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'going' } // invalid status
  });
  assert.equal(res.status, 400);
});
