import { assert } from 'chai';
import * as test from './test-utils';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

describe('API', function() {
  let server, axios, csCore, testHelper;

  before(async function() {
    server = await test.setUpAppForTest();
    axios = server.axios.alice; // Alraedy includes access token for alice@example.com
    csCore = server.csCore;
    testHelper = server.testHelper;
  });

  after(async function() {
    await test.tearDownAppForTest(server);
  });

  describe('cases', function _cases() {
    const cid =
      'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';

    it('should perform search', async function _shouldPerformSearch() {
      const res = await server.axios.bob.request({
        url: server.url + 'api/cases',
        method: 'get'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.items.length, 1);
    });

    it('should throw 400 for wrong request', async function _shouldThrow400ForWrongRequest() {
      const res1 = await axios.get(server.url + 'api/cases', {
        params: { filter: 'invalid-json' }
      });
      assert.equal(res1.status, 400);
      assert.match(res1.data.error, /bad filter/i);

      const res2 = await axios.get(server.url + 'api/cases', {
        params: { sort: 'invalid-json' }
      });
      assert.equal(res2.status, 400);
      assert.match(res2.data.error, /invalid json/i);

      const res3 = await axios.get(server.url + 'api/cases', {
        params: { sort: '{"field":11}' }
      });
      assert.equal(res3.status, 400);
      assert.match(res3.data.error, /key\/value pair/);
    });

    describe('create', function create() {
      it('should create new case', async function _shouldCreateNewCase() {
        const res = await server.axios.bob.request({
          url: server.url + 'api/cases/',
          method: 'post',
          data: {
            projectId: '8883fdef6f5144f50eb2a83cd34baa44',
            series: [
              {
                seriesUid: '111.222.333.444.777',
                partialVolumeDescriptor: {
                  start: 1,
                  end: 200,
                  delta: 1
                }
              }
            ],
            tags: []
          }
        });
        assert.equal(res.status, 200);
        assert.equal(res.data.caseId.length, 26);
      });

      it('should throw for invalid series image range', async function _shouldThrowForInvalidSeriesImageRange() {
        const res = await server.axios.bob.request({
          url: server.url + 'api/cases/',
          method: 'post',
          data: {
            projectId: '8883fdef6f5144f50eb2a83cd34baa44',
            series: [
              {
                seriesUid: '111.222.333.444.777',
                // This is out of bounds!
                partialVolumeDescriptor: {
                  start: 1,
                  end: 500
                }
              }
            ],
            tags: []
          }
        });
        assert.equal(res.status, 500);
        assert.match(res.data.error, /invalid partial volume/i);
      });

      // TODO: more checks regarding security
    });

    it('should return single case information', async function _shouldReturnSingleCaseInformation() {
      const res = await server.axios.bob.request({
        url: server.url + `api/cases/${cid}`,
        method: 'get'
      });
      assert.equal(res.data.projectId, '8883fdef6f5144f50eb2a83cd34baa44');
    });

    it('should return 404 for nonexistent case', async function() {
      const res = await server.axios.bob.request({
        url: server.url + 'api/cases/thiscaseisinvalid'
      });
      assert.equal(res.status, 404);
    });

    it('should reject revision read access from unauthorized user', async function _shouldRejectRevisionReadAccessFromUnauthorizedUser() {
      const res = await server.axios.guest.get(server.url + `api/cases/${cid}`);
      assert.equal(res.status, 401);
      assert.match(res.data.error, /read/);
    });

    it('should add a revision', async function _shouldAddARevision() {
      const res = await server.axios.bob.request({
        url: server.url + `api/cases/${cid}/revision`,
        method: 'post',
        data: {
          description: 'Add something',
          attributes: {},
          status: 'for-review',
          series: []
        }
      });
      assert.equal(res.status, 204);
      const res2 = await server.axios.bob.get(server.url + `api/cases/${cid}`);
      assert.equal(res2.data.revisions[1].creator, 'bob@example.com');
    });

    it('should reject revision addition from unauthorized user', async function _shouldRejectRevisionAdditionFromUnauthorizedUser() {
      const res = await server.axios.guest.request({
        url: server.url + `api/cases/${cid}/revision`,
        method: 'post',
        data: { anything: 'can be used' }
      });
      assert.equal(res.status, 401);
      assert.match(res.data.error, /write/);
    });
  });

  describe('blobs', function _blobs() {
    const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

    it('should accept uploading and downloading a blob', async function _shouldAcceptUploadingAndDownloadingABlob() {
      const res = await axios.request({
        method: 'put',
        url: server.url + 'api/blob/' + sha1,
        headers: { 'Content-Type': 'application/octet-stream' },
        data: 'star'
      });
      assert.equal(res.status, 200);
      const res2 = await axios.request({
        method: 'get',
        url: server.url + 'api/blob/' + sha1
      });
      assert.equal(res2.data, 'star');
    });

    it('should return 400 on hash mismatch', async function _shouldReturn400OnHashMismatch() {
      const res = await axios.request({
        method: 'put',
        url: server.url + 'api/blob/1111222233334444aaaabbbbcccc',
        headers: { 'Content-Type': 'application/octet-stream' },
        data: 'star'
      });
      assert.equal(res.status, 400);
    });

    it('should return 404 for nonexistent hash', async function _shouldReturn404ForNonexistentHash() {
      const res = await axios.request({
        method: 'get',
        url: server.url + 'api/blob/aaabbbcccdddeeefff111222333'
      });
      assert.equal(res.status, 404);
    });
  });

  describe('plugin-jobs', function _pluginJobs() {
    // (alice has sirius.org domain)
    // 111.222.333.444.444: (  1) [sirius.org]
    // 111.222.333.444.555: (150) [sirius.org]
    // 111.222.333.444.666: (100) [sirius.org]
    // 111.222.333.444.777: (236) [vega.org]

    it('should register a new plug-in job', async function _shouldRegisterANewPlugInJob() {
      const { status } = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId:
            'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
          series: [
            {
              seriesUid: '111.222.333.444.555',
              partialVolumeDescriptor: { start: 25, end: 85, delta: 3 }
            }
          ]
        }
      });
      assert.equal(status, 200);
    });

    it('should reject invalid series request', async function _shouldRegisterANewPlugInJob() {
      // Series image out of range
      const res1 = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId: 'circus-mock/empty',
          series: [
            {
              seriesUid: '111.222.333.444.444',
              partialVolumeDescriptor: { start: 1, end: 10, delta: 1 }
            }
          ],
          priority: 123
        }
      });
      assert.equal(res1.status, 400);

      // Lacks partial volume descriptor
      const res2 = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId: 'circus-mock/empty',
          series: [{ seriesUid: '111.222.333.444.777' }],
          priority: 123
        }
      });
      assert.equal(res2.status, 400);
    });

    it('should return a finished plug-in job', async function _shouldReturnAFinishedPlugInJob() {
      const res = await axios.request({
        url: server.url + 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa'
      });
      assert.equal(res.data.jobId, '01dxgwv3k0medrvhdag4mpw9wa');
      assert.equal(res.data.status, 'finished');
      assert.equal(res.status, 200);
    });

    it('should register a new feedback entry', async function _shouldRegisterANewFeedbackEntry() {
      const res = await axios.request({
        url:
          server.url +
          'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback/personal',
        method: 'post',
        data: { lesionCandidates: [] }
      });
      assert.equal(res.status, 200);
    });

    it('should return a list of feedback entries', async function _shouldReturnAListOfFeedbackEntries() {
      const res = await axios.request({
        url: server.url + 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback',
        method: 'get'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.length, 1);
    });
  });

  describe('admin/plugin-job-manager', function _adminPluginJobManager() {
    let url;

    before(function() {
      url = server.url + 'api/admin/plugin-job-manager';
    });

    it('should return the current state of a server', async function _shouldReturnTheCurrentStateOfAServer() {
      const res = await axios.get(url);
      const status = await csCore.daemon.status();
      assert.equal(res.status, 200);
      assert.equal(res.data.status, status);
    });

    it('should set the state of a server', async function _shouldSetTheStateOfAServer() {
      const res = await axios.request({
        method: 'post',
        url: url + '/switch',
        data: { status: 'running' }
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.data, { status: 'running' });
      const res2 = await axios.request({
        method: 'post',
        url: url + '/switch',
        data: { status: 'stopped' }
      });
      assert.deepEqual(res2.data, { status: 'stopped' });
    });

    it('should throw for invalid status change request', async function _shouldThrowForInvalidStatusChangeRequest() {
      const res = await axios.request({
        method: 'post',
        url: url + '/switch',
        data: { status: 'going' } // invalid status
      });
      assert.equal(res.status, 400);
    });
  });

  describe('admin/plugin-job-queue', function _adminPluginJobQueue() {
    it('should return the current queue list', async function _shouldReturnTheCurrentQueueList() {
      const res = await axios.get(server.url + 'api/admin/plugin-job-queue');
      assert.equal(res.data.items.length, 1);
    });
    it('should return a filtered queue list', async function _shouldReturnAFilteredQueueList() {
      const res = await axios.get(
        server.url + 'api/admin/plugin-job-queue?state=wait'
      );
      assert.equal(res.data.items.length, 0);
    });
  });

  describe('preference', function _preference() {
    it('should return the preference of the current user', async function _shouldReturnThePreferenceOfTheCurrentUser() {
      const res = await axios.get(server.url + 'api/preferences');
      assert.equal(res.data.theme, 'mode_white');
    });

    it('should modify the preference of the current user using PUT', async function _shouldModifyThePreferenceOfTheCurrentUserUsingPUT() {
      const res1 = await axios.request({
        url: server.url + 'api/preferences',
        method: 'put',
        data: {
          theme: 'mode_black',
          personalInfoView: false,
          seriesSearchPresets: [],
          caseSearchPresets: []
        }
      });
      assert.equal(res1.status, 204);
      const res2 = await axios.get(server.url + 'api/preferences');
      assert.equal(res2.data.theme, 'mode_black');
    });

    it('should modify the preference of the current user using PATCH', async function _shouldModifyThePreferenceOfTheCurrentUserUsingPATCH() {
      const res1 = await axios.request({
        url: server.url + 'api/preferences',
        method: 'patch',
        data: {
          theme: 'mode_black'
        }
      });
      assert.equal(res1.status, 204);
      const res2 = await axios.get(server.url + 'api/preferences');
      assert.equal(res2.data.theme, 'mode_black');
    });

    it('should reject invalid preference update', async function _shouldRejectInvalidPreferenceUpdate() {
      const res = await axios.request({
        url: server.url + 'api/preferences',
        method: 'put',
        data: { theme: 'mode_pink', personalInfoView: false }
      });
      assert.equal(res.status, 400);
    });
  });

  describe('tasks', function _tasks() {
    it('should return the list of tasks of the user', async function _shouldReturnTheListOfTasksOfTheUser() {
      const res = await axios.get(server.url + 'api/tasks');
      assert.equal(res.status, 200);
      assert.deepEqual(res.data.items.length, 1);
    });

    it('should return the information of the specified task', async function _shouldReturnTheInformationOfTheSpecifiedTask() {
      const res = await axios.get(server.url + 'api/tasks/aaaabbbbcccc1111');
      assert.equal(res.status, 200);
      assert.equal(res.data.owner, 'alice@example.com');
    });

    it('should return 404 for nonexistent task', async function _shouldReturn404ForNonexistentTask() {
      const res = await axios.get(server.url + 'api/tasks/aaaabbbbcccc0000');
      assert.equal(res.status, 404);
    });

    it("should return unauthorized for someone else's task", async function _shouldReturnUnauthorizedForSomeoneElsesTask() {
      const res = await axios.get(server.url + 'api/tasks/aaaabbbbcccc2222');
      assert.equal(res.status, 403);
    });

    it.skip('should report task progress');
  });

  describe('plugins', function _plugins() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['pluginDefinitions']);
    });

    it('should return list of all plugins', async function _shouldReturnListOfAllPlugins() {
      const res = await axios.get(server.url + 'api/plugins');
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      assert.isTrue(
        res.data.some(p => p.pluginName === 'MOCK-VALIDATION-FAILURE')
      );
    });

    it('should return plugin definition specified by pluginId', async function _shouldReturnPluginDefinitionSpecifiedByPluginId() {
      const res = await axios.get(
        server.url +
          'api/plugins/74c50a99530ef149c16bc6f0cf71b987470282c54e436e9bec6da704f1fcac9c'
      );
      assert.equal(res.status, 200);
      assert.equal(res.data.pluginName, 'MOCK-VALIDATION-FAILURE');
    });
  });
});
