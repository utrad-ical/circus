import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { TestHttpClient } from '../../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
});

after(async () => await apiTest.tearDown());

beforeEach(async () => {
  client = apiTest.clients.alice;
  await setUpMongoFixture(apiTest.database.db, ['onetimeUrls']);
});

test('creates a one-time URL', async () => {
  const userEmail = 'bob@example.com';
  const res = await client.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 201);
});

test('returns 401 for an unauthorized user', async () => {
  client = apiTest.clients.carol;
  const userEmail = 'bob@example.com';
  const res = await client.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 401);
});

test('returns 404 for a nonexistent user', async () => {
  const userEmail = 'nonexistentuser@example.com';
  const res = await client.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 404);
});

test('returns 400 for a user whose login is disabled', async () => {
  const userEmail = 'eve@example.com';
  const res = await client.request({
    method: 'post',
    url: `api/admin/onetime-urls`,
    data: { user: userEmail }
  });
  assert.equal(res.status, 400);
});
