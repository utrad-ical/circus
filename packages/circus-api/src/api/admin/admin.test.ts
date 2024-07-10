import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    console.log('apiTest initialized:', apiTest);
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
  console.log('beforeAll completed');
});
afterAll(async () => {
  console.log('afterAll started');
  try {
    if (apiTest && typeof apiTest.tearDown === 'function') {
      console.log('Calling tearDown');
      await apiTest.tearDown();
      console.log('tearDown called successfully');
    } else {
      console.error('tearDown is not a function or apiTest is undefined');
    }
  } catch (error) {
    console.error('Error during teardown:', error);
    throw error;
  }
  console.log('afterAll completed');
});

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
      expect(res.status).toBe(401);
      expect(res.data.error).toMatch(/privilege/);
    };

    // Check with these users without admin privilege
    await check(apiTest.axiosInstances.bob);
    await check(apiTest.axiosInstances.guest);
  }
});
