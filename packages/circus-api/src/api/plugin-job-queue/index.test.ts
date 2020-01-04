import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

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
