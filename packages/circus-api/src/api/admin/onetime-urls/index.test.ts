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
  axios = apiTest.axiosInstances.alice;
  await setUpMongoFixture(apiTest.database.db, ['onetimeUrls']);
});

test('create a one time URL', async () => {
  const userEmail = 'bob@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  expect(res.status).toBe(201);
});

test('throw 401 error for unauthorized user', async () => {
  axios = apiTest.axiosInstances.carol;
  const userEmail = 'bob@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  expect(res.status).toBe(401);
});

test('throw 404 error for nonexistent user', async () => {
  const userEmail = 'nonexistentuser@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  expect(res.status).toBe(404);
});

test('throw 400 error for login disabled user', async () => {
  const userEmail = 'eve@example.com';
  const res = await axios.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  expect(res.status).toBe(400);
});
