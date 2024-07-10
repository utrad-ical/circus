import { AxiosInstance } from 'axios';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';

let apiTest: ApiTest, dave: AxiosInstance;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    dave = apiTest.axiosInstances.dave;
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

test('get project', async () => {
  const res = await dave.get('api/projects/8883fdef6f5144f50eb2a83cd34baa44');
  expect(res.status).toBe(200);
});
