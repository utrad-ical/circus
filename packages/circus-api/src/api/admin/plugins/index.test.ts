import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../../test/util-routes.ts';
import { setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { AxiosInstance } from 'axios';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

describe('admin/plugins', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
  });

  test('should return list of plugins', async () => {
    const res = await axios.get('api/admin/plugins');
    assert.equal(res.status, 200);
    assert.ok(res.data.items instanceof Array);
    assert.equal(
      res.data.items.some(
        (p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE'
      ),
      true
    );
  });

  test('should update plugin', async () => {
    const res = await axios.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    const res2 = await axios.patch(`api/admin/plugins/${pluginId}`, {
      pluginName: 'NEW-NAME'
    });
    assert.equal(res2.status, 204);
    const res3 = await axios.get('api/admin/plugins');
    assert.equal(
      res3.data.items.some((p: any) => p.pluginName === 'NEW-NAME'),
      true
    );
  });

  test('should not change the ID or the type', async () => {
    const res = await axios.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    for (const data of [{ pluginId: 'other' }, { type: 'CAD' }]) {
      const res2 = await axios.patch(`api/admin/plugins/${pluginId}`, data);
      assert.equal(res2.status, httpStatus.BAD_REQUEST);
    }
  });

  test('should not be listed for a user without manageServer', async () => {
    const res = await apiTest.axiosInstances.bob.get('api/admin/plugins');
    assert.equal(res.status, httpStatus.UNAUTHORIZED);
  });

  test('should point at the invalid field when updating', async () => {
    const res = await axios.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    const res2 = await axios.request({
      method: 'patch',
      url: `api/admin/plugins/${pluginId}`,
      data: { pluginName: 42 }
    });
    assert.equal(res2.status, httpStatus.BAD_REQUEST);
    // The admin editor shows complaints by this path
    assert.deepEqual(res2.data.issues[0].path, ['pluginName']);
  });

  test('should search plugins', async () => {
    const res = await axios.get('api/admin/plugins', {
      params: { filter: JSON.stringify({ type: 'CAD' }) }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 3);
  });

  test('should create plugin', async () => {
    const res = await axios.post('api/admin/plugins', {
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
    const res2 = await axios.get('api/admin/plugins');
    assert.equal(
      res2.data.items.some((p: any) => p.pluginName === 'NEW-PLUGIN'),
      true
    );
  });
});
