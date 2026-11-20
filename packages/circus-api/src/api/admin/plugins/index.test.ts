import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { TestHttpClient } from '../../../test/util-http.ts';
import httpStatus from 'http-status';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

describe('admin/plugins', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
  });

  test('lists plug-ins', async () => {
    const res = await client.get('api/admin/plugins');
    assert.equal(res.status, 200);
    assert.ok(res.data.items instanceof Array);
    assert.equal(
      res.data.items.some(
        (p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE'
      ),
      true
    );
  });

  test('updates a plug-in', async () => {
    const res = await client.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    const res2 = await client.patch(`api/admin/plugins/${pluginId}`, {
      pluginName: 'NEW-NAME'
    });
    assert.equal(res2.status, 204);
    const res3 = await client.get('api/admin/plugins');
    assert.equal(
      res3.data.items.some((p: any) => p.pluginName === 'NEW-NAME'),
      true
    );
  });

  test('keeps the plug-in ID and type unchanged', async () => {
    const res = await client.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    for (const data of [{ pluginId: 'other' }, { type: 'CAD' }]) {
      const res2 = await client.patch(`api/admin/plugins/${pluginId}`, data);
      assert.equal(res2.status, httpStatus.BAD_REQUEST);
    }
  });

  test('denies access to the plug-in list without the manageServer privilege', async () => {
    const res = await apiTest.clients.bob.get('api/admin/plugins');
    assert.equal(res.status, httpStatus.UNAUTHORIZED);
  });

  test('identifies the invalid field in a plug-in update', async () => {
    const res = await client.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    const res2 = await client.request({
      method: 'patch',
      url: `api/admin/plugins/${pluginId}`,
      data: { pluginName: 42 }
    });
    assert.equal(res2.status, httpStatus.BAD_REQUEST);
    // The admin editor shows complaints by this path
    assert.deepEqual(res2.data.issues[0].path, ['pluginName']);
  });

  test('returns plug-ins matching the search filter', async () => {
    const res = await client.get('api/admin/plugins', {
      params: { filter: JSON.stringify({ type: 'CAD' }) }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 3);
  });

  test('creates a plug-in', async () => {
    const res = await client.post('api/admin/plugins', {
      pluginId:
        'aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbccccccccccccccccdddddddddddddddd',
      pluginName: 'NEW-PLUGIN',
      version: '1.0.0',
      type: 'CAD',
      description: 'This is a new plugin',
      runConfiguration: { timeout: 1000, gpus: '1' },
      icon: { glyph: 'calc', color: '#ffffff', backgroundColor: '#555555' },
      displayStrategy: []
    });
    assert.equal(res.status, httpStatus.CREATED);
    const res2 = await client.get('api/admin/plugins');
    assert.equal(
      res2.data.items.some((p: any) => p.pluginName === 'NEW-PLUGIN'),
      true
    );
  });
});
