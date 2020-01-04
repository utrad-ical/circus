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
