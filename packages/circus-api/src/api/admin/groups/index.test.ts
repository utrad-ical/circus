import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
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
  await setUpMongoFixture(apiTest.database.db, ['groups']);
});

test('lists groups', async () => {
  const res = await client.get('api/admin/groups');
  assert.ok(res.data.items instanceof Array);
  assert.equal(res.data.items[0].groupName, 'admin');
});

test('returns a group', async () => {
  const res = await client.get('api/admin/groups/1');
  assert.equal(res.data.groupName, 'admin');
});

test('returns 404 for a nonexistent group', async () => {
  const res1 = await client.get('api/admin/groups/7');
  assert.equal(res1.status, 404);
  const res2 = await client.get('api/admin/groups/bad');
  assert.equal(res2.status, 404);
});

test('updates a group', async () => {
  const res1 = await client.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 'root' }
  });
  assert.equal(res1.status, 204);
  const res2 = await client.get('api/admin/groups/1');
  assert.equal(res2.data.groupName, 'root');
});

const basicGroupData = {
  groupName: 'sakura',
  privileges: [],
  domains: [],
  readProjects: [],
  writeProjects: [],
  addSeriesProjects: [],
  viewPersonalInfoProjects: [],
  moderateProjects: [],
  readPlugin: [],
  executePlugin: [],
  manageJobs: [],
  inputPersonalFeedback: [],
  inputConsensualFeedback: [],
  manageFeedback: [],
  viewPersonalInfo: []
};

test('adds a new group', async () => {
  const res = await client.request({
    method: 'post',
    url: 'api/admin/groups',
    data: basicGroupData
  });
  assert.equal(res.status, 201);
});

test('returns 400 for an invalid group update', async () => {
  const res1 = await client.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 72 }
  });
  assert.equal(res1.status, 400);

  const res2 = await client.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupId: 45 }
  });
  assert.equal(res2.status, 400);
  assert.deepEqual(res2.data.issues[0].path, ['groupId']);

  const res3 = await client.request({
    method: 'post',
    url: 'api/admin/groups',
    data: { ...basicGroupData, groupId: 77 }
  });
  assert.equal(res3.status, 400);
  assert.deepEqual(res3.data.issues[0].path, ['groupId']);
});

const permissionsDependencies = {
  writeProjects: ['readProjects'],
  viewPersonalInfoProjects: ['readProjects'],
  moderateProjects: ['readProjects'],
  addSeriesProjects: ['readProjects'],
  executePlugin: ['readPlugin'],
  manageJobs: ['readPlugin'],
  inputPersonalFeedback: ['readPlugin'],
  inputConsensualFeedback: ['readPlugin'],
  manageFeedback: ['readPlugin'],
  viewPersonalInfo: ['readPlugin']
};

const updateGroupData = async (
  data: typeof basicGroupData,
  expectedStatus: number
) => {
  const res = await client.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data
  });
  assert.equal(res.status, expectedStatus);
};

describe('group permission updates', () => {
  describe('success cases', () => {
    for (const [permission, dependencies] of Object.entries(
      permissionsDependencies
    )) {
      test(`returns 204 when dependencies for ${permission} are met`, async () => {
        const data = {
          ...basicGroupData,
          [permission]: ['sampleId'],
          ...dependencies.reduce(
            (acc, dep) => ({ ...acc, [dep]: ['sampleId'] }),
            {}
          )
        };

        await updateGroupData(data, 204);
      });
    }
  });

  describe('failure cases', () => {
    for (const permission of Object.keys(permissionsDependencies)) {
      test(`returns 400 when dependencies for ${permission} are missing`, async () => {
        const data = {
          ...basicGroupData,
          [permission]: ['sampleId']
        };

        await updateGroupData(data, 400);
      });
    }
  });
});

test('lists global privileges with captions', async () => {
  const res = await client.get('api/admin/global-privileges');
  assert.ok(res.data.length > 1);
  assert.equal(
    res.data.every((p: any) => p.privilege && p.caption),
    true
  );
});

// test.skip('rejects an unknown field', () => {});
