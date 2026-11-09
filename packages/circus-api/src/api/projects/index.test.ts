import type { AxiosInstance } from 'axios';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';

let apiTest: ApiTest, dave: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  dave = apiTest.axiosInstances.dave;
});
afterAll(async () => await apiTest.tearDown());

test('get project', async () => {
  const res = await dave.get('api/projects/8883fdef6f5144f50eb2a83cd34baa44');
  expect(res.status).toBe(200);
});
