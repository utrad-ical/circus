import assert from 'node:assert/strict';
import { it, before, after, beforeEach } from 'node:test';
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
  await setUpMongoFixture(apiTest.database.db, ['serverParams']);
});

it('should return parameters', async () => {
  const res = await client.get('api/admin/server-params');
  assert.deepEqual(res.data, {
    foo: 'bar',
    color: ['green', 'black', 'blue'],
    defaultDomain: 'default'
  });
});

it('should return one parameter', async () => {
  const res = await client.get('api/admin/server-params/color');
  assert.deepEqual(res.data, ['green', 'black', 'blue']);
});

it('should update one parameter', async () => {
  const res = await client.request({
    url: 'api/admin/server-params/color',
    method: 'put',
    data: ['orange']
  });
  assert.equal(res.status, 204);
  const res2 = await client.get('api/admin/server-params');
  assert.deepEqual(res2.data.color, ['orange']);
});

it('should bulk-update parametes', async () => {
  const res = await client.request({
    url: 'api/admin/server-params',
    method: 'put',
    data: { foo: 'buz', price: 1980 }
  });
  assert.equal(res.status, 204);
  const res2 = await client.get('api/admin/server-params');
  assert.deepEqual(res2.data, {
    foo: 'buz',
    color: ['green', 'black', 'blue'],
    defaultDomain: 'default',
    price: 1980
  });
});
