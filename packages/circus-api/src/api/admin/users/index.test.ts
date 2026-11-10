import assert from 'node:assert/strict';
import { test, it, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['users']);
});

it('should return list of users', async () => {
  const res = await axios.get('api/admin/users');
  assert.ok(res.data.items instanceof Array);
  assert.equal(
    res.data.items.some((u: any) => u.loginId === 'bob'),
    true
  );
  assert.equal(
    res.data.items.some((u: any) => u.password),
    false
  );
});

it('should return a user', async () => {
  const res = await axios.get('api/admin/users/alice@example.com');
  assert.equal(res.data.loginId, 'alice');
  assert.ok(!('password' in res.data));
});

it('should return error for nonexistent user', async () => {
  const res = await axios.get('api/admin/user/john@due.com');
  assert.equal(res.status, 404);
});

it('should update a user', async () => {
  await axios.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { loginId: 'anastasia' }
  });
  const res2 = await axios.get('api/admin/users/alice@example.com');
  assert.equal(res2.data.loginId, 'anastasia');
});

it('should return error for invalid user update', async () => {
  const res1 = await axios.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { groups: ['this-must-not-be', 'strings'] }
  });
  assert.equal(res1.status, 400);

  const res2 = await axios.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { userEmail: 'alice.new.mail@example.com' }
  });
  assert.equal(res2.status, 400);
  assert.match(res2.data.error, /primary key/);
});

test('should create a user', async () => {
  const res = await axios.request({
    method: 'post',
    url: 'api/admin/users',
    data: {
      userEmail: 'test@example.com',
      loginId: 'test',
      password: 'test',
      preferences: {
        theme: 'mode_black',
        personalInfoView: true,
        seriesSearchPresets: [],
        caseSearchPresets: [],
        pluginJobSearchPresets: []
      },
      loginEnabled: true,
      description: '',
      groups: [1]
    }
  });
  assert.equal(res.status, 201);
  assert.partialDeepStrictEqual(res.data, { userEmail: 'test@example.com' });
  const res2 = await axios.get('api/admin/users/test@example.com');
  assert.equal(res2.data.loginId, 'test');
});

//  it.skip('should reject unknown field');
