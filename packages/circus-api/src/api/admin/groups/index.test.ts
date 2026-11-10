import assert from 'node:assert/strict';
import { describe, it, before, after, beforeEach } from 'node:test';
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
  await setUpMongoFixture(apiTest.database.db, ['groups']);
});

it('should return list of groups', async () => {
  const res = await axios.get('api/admin/groups');
  assert.ok(res.data.items instanceof Array);
  assert.equal(res.data.items[0].groupName, 'admin');
});

it('should return a group', async () => {
  const res = await axios.get('api/admin/groups/1');
  assert.equal(res.data.groupName, 'admin');
});

it('should return error for nonexistent group', async () => {
  const res1 = await axios.get('api/admin/groups/7');
  assert.equal(res1.status, 404);
  const res2 = await axios.get('api/admin/groups/bad');
  assert.equal(res2.status, 404);
});

it('should update a group', async () => {
  const res1 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 'root' }
  });
  assert.equal(res1.status, 204);
  const res2 = await axios.get('api/admin/groups/1');
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

it('should add a new group', async () => {
  const res = await axios.request({
    method: 'post',
    url: 'api/admin/groups',
    data: basicGroupData
  });
  assert.equal(res.status, 201);
});

it('should return error for invalid group update', async () => {
  const res1 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 72 }
  });
  assert.equal(res1.status, 400);

  const res2 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupId: 45 }
  });
  assert.equal(res2.status, 400);
  assert.match(res2.data.error, /primary key/);

  const res3 = await axios.request({
    method: 'post',
    url: 'api/admin/groups',
    data: { ...basicGroupData, groupId: 77 }
  });
  assert.equal(res3.status, 400);
  assert.match(res3.data.error, /Group ID cannot be specified/);
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
  const res = await axios.request({
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
      it(`${permission}: should update successfully when dependencies are met`, async () => {
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
      it(`${permission}: should fail to update when dependencies are not met`, async () => {
        const data = {
          ...basicGroupData,
          [permission]: ['sampleId']
        };

        await updateGroupData(data, 400);
      });
    }
  });
});

it('should return global-privileges', async () => {
  const res = await axios('api/admin/global-privileges');
  assert.ok(res.data.length > 1);
  assert.equal(
    res.data.every((p: any) => p.privilege && p.caption),
    true
  );
});

// it.skip('should reject unknown field', () => {});
