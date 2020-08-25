import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

it.skip('should return the list of tasks of the user', async () => {
  const res = await axios.get('api/tasks');
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
});

it.skip('should return the information of the specified task', async () => {
  const res = await axios.get('api/tasks/aaaabbbbcccc1111');
  expect(res.status).toBe(200);
  expect(res.data.owner).toBe('alice@example.com');
});

it('should return 404 for nonexistent task', async () => {
  const res = await axios.get('api/tasks/aaaabbbbcccc0000');
  expect(res.status).toBe(404);
});

it.skip("should return unauthorized for someone else's task", async () => {
  const res = await axios.get('api/tasks/aaaabbbbcccc2222');
  expect(res.status).toBe(403);
});

// it.skip('should report task progress');
