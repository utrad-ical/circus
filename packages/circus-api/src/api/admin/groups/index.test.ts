import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { setUpMongoFixture } from '../../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['groups']);
});

it('should return list of groups', async () => {
  const res = await axios.get('api/admin/groups');
  expect(res.data.items).toBeInstanceOf(Array);
  expect(res.data.items[0].groupName).toBe('admin');
});

it('should return a group', async () => {
  const res = await axios.get('api/admin/groups/1');
  expect(res.data.groupName).toBe('admin');
});

it('should return error for nonexistent group', async () => {
  const res1 = await axios.get('api/admin/groups/7');
  expect(res1.status).toBe(404);
  const res2 = await axios.get('api/admin/groups/bad');
  expect(res2.status).toBe(404);
});

it('should update a group', async () => {
  const res1 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 'root' }
  });
  expect(res1.status).toBe(204);
  const res2 = await axios.get('api/admin/groups/1');
  expect(res2.data.groupName).toBe('root');
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
  expect(res.status).toBe(201);
});

it('should return error for invalid group update', async () => {
  const res1 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupName: 72 }
  });
  expect(res1.status).toBe(400);

  const res2 = await axios.request({
    method: 'patch',
    url: 'api/admin/groups/1',
    data: { groupId: 45 }
  });
  expect(res2.status).toBe(400);
  expect(res2.data.error).toMatch(/primary key/);

  const res3 = await axios.request({
    method: 'post',
    url: 'api/admin/groups',
    data: { ...basicGroupData, groupId: 77 }
  });
  expect(res3.status).toBe(400);
  expect(res3.data.error).toMatch(/Group ID cannot be specified/);
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
  expect(res.status).toBe(expectedStatus);
};

describe('group permission updates', () => {
  describe('success cases', () => {
    it.each(Object.entries(permissionsDependencies))(
      '%s: should update successfully when dependencies are met',
      async (permission, dependencies) => {
        const data = {
          ...basicGroupData,
          [permission]: ['sampleId'],
          ...dependencies.reduce(
            (acc, dep) => ({ ...acc, [dep]: ['sampleId'] }),
            {}
          )
        };

        await updateGroupData(data, 204);
      }
    );
  });

  describe('failure cases', () => {
    it.each(Object.entries(permissionsDependencies))(
      '%s: should fail to update when dependencies are not met',
      async permission => {
        const data = {
          ...basicGroupData,
          [permission]: ['sampleId']
        };

        await updateGroupData(data, 400);
      }
    );
  });
});

it('should return global-privileges', async () => {
  const res = await axios('api/admin/global-privileges');
  expect(res.data.length).toBeGreaterThan(1);
  expect(res.data.every((p: any) => p.privilege && p.caption)).toBe(true);
});

// it.skip('should reject unknown field', () => {});
