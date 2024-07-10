import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { setUpMongoFixture } from '../../../../test/util-mongo';
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

describe('admin/plugins', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
  });

  test('should return list of plugins', async () => {
    const res = await axios.get('api/admin/plugins');
    expect(res.status).toBe(200);
    expect(res.data.items).toBeInstanceOf(Array);
    expect(
      res.data.items.some(
        (p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE'
      )
    ).toBe(true);
  });
});
