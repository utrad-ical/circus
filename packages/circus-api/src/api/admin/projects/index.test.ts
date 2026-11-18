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

it('should return list of projects', async () => {
  const res = await client.get('api/admin/projects');
  assert.equal(res.status, 200);
  assert.ok(res.data.items instanceof Array);
  assert.equal(
    res.data.items.some((p: any) => p.projectName === 'Lung nodules'),
    true
  );
});

it('should return a project', async () => {
  const res = await client.get(
    'api/admin/projects/8883fdef6f5144f50eb2a83cd34baa44'
  );
  assert.equal(res.data.projectName, 'Lung nodules');
});
