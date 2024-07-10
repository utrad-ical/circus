import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
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
  axios = apiTest.axiosInstances.alice;
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

test('logout', async () => {
  const res1 = await axios.get('api/logout');
  expect(res1.status).toBe(httpStatus.NO_CONTENT);
  const res2 = await axios.get('api/login-info');
  expect(res2.status).toBe(httpStatus.UNAUTHORIZED);
});

test('preserve permanent token', async () => {
  const res = await apiTest.axiosInstances.guest.get('api/logout');
  expect(res.status).toBe(httpStatus.NO_CONTENT);
  const rows = await apiTest.database.db
    .collection('tokens')
    .find({ userId: 'guest@example.com' })
    .toArray();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.permanentTokenId).toMatch(/.{10,}/);
});
