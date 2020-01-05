import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

test('short', async () => {
  const res = await axios.get('api/login-info');
  expect(res.data).toEqual({
    userEmail: 'alice@example.com',
    loginId: 'alice'
  });
});

test('full', async () => {
  const res = await axios.get('api/login-info/full');
  expect(res.data).toMatchObject({
    userEmail: 'alice@example.com',
    loginId: 'alice'
  });
});
