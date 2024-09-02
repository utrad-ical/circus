import { setUpAppForRoutesTest, ApiTest } from '../../test/util-routes';
import { setUpMongoFixture } from '../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
});

it('should return list of all plugins', async () => {
  const res = await axios.get('api/plugins');
  expect(res.status).toBe(200);
  expect(res.data).toBeInstanceOf(Array);
  expect(res.data.some((p: any) => p.pluginName === 'MOCK-EMPTY')).toBe(true);
});

it('should return plugin definition specified by pluginId', async () => {
  const res = await axios.get(
    'api/plugins/d135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
  );
  expect(res.status).toBe(200);
  expect(res.data.pluginName).toBe('MOCK-EMPTY');
});
