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
});
