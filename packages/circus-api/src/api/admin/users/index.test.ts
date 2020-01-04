import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { setUpMongoFixture } from '../../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.db, ['users']);
});

it('should return list of users', async () => {
  const res = await axios.get('api/admin/users');
  expect(res.data.items).toBeInstanceOf(Array);
  expect(res.data.items.some((u: any) => u.loginId === 'bob')).toBe(true);
  expect(res.data.items.some((u: any) => u.password)).toBe(false);
});

it('should return a user', async () => {
  const res = await axios.get('api/admin/users/alice@example.com');
  expect(res.data.loginId).toBe('alice');
  expect(res.data).not.toHaveProperty('password');
});

it('should return error for nonexistent user', async () => {
  const res = await axios.get('api/admin/user/john@due.com');
  expect(res.status).toBe(404);
});

it('should update a user', async () => {
  await axios.request({
    method: 'put',
    url: 'api/admin/users/alice@example.com',
    data: { loginId: 'anastasia' }
  });
  const res2 = await axios.get('api/admin/users/alice@example.com');
  expect(res2.data.loginId).toBe('anastasia');
});

it('should return error for invalid user update', async () => {
  const res1 = await axios.request({
    method: 'put',
    url: 'api/admin/users/alice@example.com',
    data: { groups: ['this-must-not-be', 'strings'] }
  });
  expect(res1.status).toBe(400);

  const res2 = await axios.request({
    method: 'put',
    url: 'api/admin/users/alice@example.com',
    data: { userEmail: 'alice.new.mail@example.com' }
  });
  expect(res2.status).toBe(400);
  expect(res2.data.error).toMatch(/primary key/);
});

//  it.skip('should reject unknown field');
