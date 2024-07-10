import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { setUpMongoFixture } from '../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    axios = apiTest.axiosInstances.alice;
    console.log('apiTest initialized:', apiTest);
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
  console.log('beforeAll completed');
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

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
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
