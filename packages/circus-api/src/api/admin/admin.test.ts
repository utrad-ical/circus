import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest;
beforeAll(async () => (apiTest = await setUpAppForRoutesTest()));
afterAll(async () => await apiTest.tearDown());

test('return unauthorized error for unauthorized user', async () => {
  const targets = [
    'groups',
    'groups/1',
    'PUT groups/1',
    'users',
    'users/alice@example.com',
    'PUT users/alice@example.com',
    'projects',
    'server-params'
  ];

  for (const target of targets) {
    const method = target.indexOf(' ') >= 0 ? target.split(' ')[0] : 'GET';
    const path = target.split(' ').pop();
    const data = method.match(/GET|PUT/) ? { a: 10 } : undefined;

    const check = async (user: AxiosInstance) => {
      const res = await user.request({
        url: `api/admin/${path}`,
        method: method as any,
        data
      });
      expect(res.status).toBe(401);
      expect(res.data.error).toMatch(/privilege/);
    };

    // Check with these users without admin privilege
    await check(apiTest.axiosInstances.bob);
    await check(apiTest.axiosInstances.guest);
  }
});
