import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

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
