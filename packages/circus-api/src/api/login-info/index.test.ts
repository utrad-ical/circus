import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.bob;
});
afterAll(async () => await apiTest.tearDown());

test('short', async () => {
  const res = await axios.get('api/login-info');
  expect(res.data).toEqual({
    userEmail: 'bob@example.com',
    loginId: 'bob'
  });
});

test('full', async () => {
  const res = await axios.get('api/login-info/full');
  expect(res.data).toMatchObject({
    userEmail: 'bob@example.com',
    loginId: 'bob',
    description: 'Bob'
  });
  expect(res.data.sharedMyLists).toHaveLength(1);
});
