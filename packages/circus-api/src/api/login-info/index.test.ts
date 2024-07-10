import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

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
  axios = apiTest.axiosInstances.bob;
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
