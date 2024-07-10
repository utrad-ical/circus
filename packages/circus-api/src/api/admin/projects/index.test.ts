import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
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

it('should return list of projects', async () => {
  const res = await axios.get('api/admin/projects');
  expect(res.status).toBe(200);
  expect(res.data.items).toBeInstanceOf(Array);
  expect(
    res.data.items.some((p: any) => p.projectName === 'Lung nodules')
  ).toBe(true);
});

it('should return a project', async () => {
  const res = await axios.get(
    'api/admin/projects/8883fdef6f5144f50eb2a83cd34baa44'
  );
  expect(res.data.projectName).toBe('Lung nodules');
});
