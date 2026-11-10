import assert from 'node:assert/strict';
import { it, before, after, beforeEach } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
});

it('should return list of all plugins', async () => {
  const res = await axios.get('api/plugins');
  assert.equal(res.status, 200);
  assert.ok(res.data instanceof Array);
  assert.equal(
    res.data.some((p: any) => p.pluginName === 'MOCK-EMPTY'),
    true
  );
});

it('should return plugin definition for CAD type specified by pluginId', async () => {
  const res = await axios.get(
    'api/plugins/d135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
  );
  assert.equal(res.status, 200);
  assert.equal(res.data.pluginName, 'MOCK-EMPTY');
});

it('should return plugin definition for CAD+remote type specified by pluginId', async () => {
  const res = await axios.get(
    'api/plugins/rmt-d135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
  );
  assert.equal(res.status, 200);
  assert.equal(res.data.pluginName, 'MOCK-EMPTY-REMOTE');
});
