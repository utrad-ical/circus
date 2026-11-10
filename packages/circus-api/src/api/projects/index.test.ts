import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { AxiosInstance } from 'axios';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';

let apiTest: ApiTest, dave: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  dave = apiTest.axiosInstances.dave;
});
after(async () => await apiTest.tearDown());

test('get project', async () => {
  const res = await dave.get('api/projects/8883fdef6f5144f50eb2a83cd34baa44');
  assert.equal(res.status, 200);
});
