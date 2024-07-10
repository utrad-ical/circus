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

test('return user info by userEmail', async () => {
  const res = await axios.get('api/users/alice@example.com');
  expect(res.status).toBe(200);
  expect(res.data).toMatchObject({
    userEmail: 'alice@example.com',
    loginId: 'alice',
    description: 'Alice'
  });
});
