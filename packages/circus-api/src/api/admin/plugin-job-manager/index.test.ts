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

const url = 'api/admin/plugin-job-manager';

it('should return the current state of a server', async () => {
  const res = await axios.get(url);
  const status = await apiTest.csCore.daemon.status();
  expect(res.status).toBe(200);
  expect(res.data.status).toBe(status);
});

it('should set the state of a server', async () => {
  const res = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'running' }
  });
  expect(res.status).toBe(200);
  expect(res.data).toEqual({ status: 'running' });
  const res2 = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'stopped' }
  });
  expect(res2.data).toEqual({ status: 'stopped' });
});

it('should throw for invalid status change request', async () => {
  const res = await axios.request({
    method: 'put',
    url: url + '/switch',
    data: { status: 'going' } // invalid status
  });
  expect(res.status).toBe(400);
});
