import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { TestHttpClient } from '../../test/util-http.ts';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
});

test('returns user information by email address', async () => {
  const res = await client.get('api/users/alice@example.com');
  assert.equal(res.status, 200);
  assert.partialDeepStrictEqual(res.data, {
    userEmail: 'alice@example.com',
    loginId: 'alice',
    description: 'Alice'
  });
});
