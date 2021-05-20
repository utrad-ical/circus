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

test('preserve permanent token', async () => {
  const res = await apiTest.axiosInstances.guest.get('api/logout');
  expect(res.status).toBe(httpStatus.NO_CONTENT);
  const rows = await apiTest.db
    .collection('tokens')
    .find({ userId: 'guest@example.com' })
    .toArray();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.permanentTokenId).toMatch(/.{10,}/);
});
