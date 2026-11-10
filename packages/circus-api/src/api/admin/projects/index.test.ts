import { it, before, after } from 'node:test';
import { expect } from 'expect';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

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
