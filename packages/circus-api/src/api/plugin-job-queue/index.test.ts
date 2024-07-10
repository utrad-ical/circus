import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    axios = apiTest.axiosInstances.alice;
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

it('should return the current queue list', async () => {
  const res = await axios.get('api/admin/plugin-job-queue');
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
});

it('should return a filtered queue list', async () => {
  const res = await axios.get('api/admin/plugin-job-queue?state=wait');
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(0);
});
