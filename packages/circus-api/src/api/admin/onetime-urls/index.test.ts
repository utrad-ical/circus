import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { setUpMongoFixture } from '../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
});

afterAll(async () => await apiTest.tearDown());

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
