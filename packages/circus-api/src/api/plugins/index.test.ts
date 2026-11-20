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

test('lists the available plug-ins', async () => {
  const res = await client.get('api/plugins');
  assert.equal(res.status, 200);
  assert.ok(res.data instanceof Array);
  assert.equal(
    res.data.some((p: any) => p.pluginName === 'MOCK-EMPTY'),
    true
  );
});

test('returns a CAD plug-in definition by ID', async () => {
  const res = await client.get(
    'api/plugins/d135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
  );
  assert.equal(res.status, 200);
  assert.equal(res.data.pluginName, 'MOCK-EMPTY');
});
