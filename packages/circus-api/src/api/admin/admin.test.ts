import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest;
before(async () => (apiTest = await setUpAppForRoutesTest()));
after(async () => await apiTest.tearDown());

test('return unauthorized error for unauthorized user', async () => {
  const targets = [
    'groups',
    'groups/1',
    'PATCH groups/1',
    'users',
    'users/alice@example.com',
    'PATCH users/alice@example.com',
    'projects',
    'server-params'
  ];

  for (const target of targets) {
    const method = target.indexOf(' ') >= 0 ? target.split(' ')[0] : 'GET';
    const path = target.split(' ').pop();
    const data = method.match(/GET|PATCH/) ? { a: 10 } : undefined;

    const check = async (user: AxiosInstance) => {
      const res = await user.request({
        url: `api/admin/${path}`,
        method: method as any,
        data
      });
      assert.equal(res.status, 401);
      assert.match(res.data.error, /privilege/);
    };

    // Check with these users without admin privilege
    await check(apiTest.axiosInstances.bob);
    await check(apiTest.axiosInstances.guest);
  }
});
