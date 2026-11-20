import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { TestHttpClient } from '../../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['users']);
});

test('lists users', async () => {
  const res = await client.get('api/admin/users');
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

test('returns a user without the password', async () => {
  const res = await client.get('api/admin/users/alice@example.com');
  assert.equal(res.data.loginId, 'alice');
  assert.ok(!('password' in res.data));
});

test('returns 404 for a nonexistent user', async () => {
  const res = await client.get('api/admin/user/john@due.com');
  assert.equal(res.status, 404);
});

test('updates a user', async () => {
  await client.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { loginId: 'anastasia' }
  });
  const res2 = await client.get('api/admin/users/alice@example.com');
  assert.equal(res2.data.loginId, 'anastasia');
});

test('returns 400 for an invalid user update', async () => {
  const res1 = await client.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { groups: ['this-must-not-be', 'strings'] }
  });
  assert.equal(res1.status, 400);

  const res2 = await client.request({
    method: 'patch',
    url: 'api/admin/users/alice@example.com',
    data: { userEmail: 'alice.new.mail@example.com' }
  });
  assert.equal(res2.status, 400);
  assert.deepEqual(res2.data.issues[0].path, ['userEmail']);
});

test('creates a user', async () => {
  const res = await client.request({
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
  const res2 = await client.get('api/admin/users/test@example.com');
  assert.equal(res2.data.loginId, 'test');
});

//  test.skip('rejects an unknown field');
