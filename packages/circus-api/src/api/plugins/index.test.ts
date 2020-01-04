import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { setUpMongoFixture } from '../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.db, ['pluginDefinitions']);
});

it('should return list of all plugins', async () => {
  const res = await axios.get('api/plugins');
  expect(res.status).toBe(200);
  expect(res.data).toBeInstanceOf(Array);
  expect(
    res.data.some((p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE')
  ).toBe(true);
});

it('should return plugin definition specified by pluginId', async () => {
  const res = await axios.get(
    'api/plugins/74c50a99530ef149c16bc6f0cf71b987470282c54e436e9bec6da704f1fcac9c'
  );
  expect(res.status).toBe(200);
  expect(res.data.pluginName).toBe('MOCK-VALIDATION-FAILURE');
});
