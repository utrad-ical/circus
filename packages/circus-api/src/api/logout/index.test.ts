import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

test('logout', async () => {
  const res1 = await axios.get('api/logout');
  expect(res1.status).toBe(httpStatus.NO_CONTENT);
  const res2 = await axios.get('api/login-info');
  expect(res2.status).toBe(httpStatus.UNAUTHORIZED);
});
