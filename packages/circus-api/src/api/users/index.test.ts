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

test('return user info by userEmail', async () => {
  const res = await axios.get('api/users/alice@example.com');
  expect(res.status).toBe(200);
  expect(res.data).toMatchObject({
    userEmail: 'alice@example.com',
    description: 'Alice'
  });
});
