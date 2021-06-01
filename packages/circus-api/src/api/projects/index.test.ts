import { AxiosInstance } from 'axios';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';

let apiTest: ApiTest, dave: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  dave = apiTest.axiosInstances.dave;
});
afterAll(async () => {
  apiTest.tearDown();
});

test('get project', async () => {
  const res = await dave.get('api/projects/8883fdef6f5144f50eb2a83cd34baa44');
  expect(res.status).toBe(200);
});
