import { assert } from 'chai';
import * as test from './test-utils';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

describe('API', function() {
  let server, axios, csCore, testHelper;

  before(async function() {
    server = await test.setUpAppForTest('trace');
    axios = server.axios.alice; // Alraedy includes access token for alice@example.com
    csCore = server.csCore;
    testHelper = server.testHelper;
  });

  after(async function() {
    await test.tearDownAppForTest(server);
  });

  describe('admin', function _admin() {
    it('should return unauthorized error for unauthorized user', async function _shouldReturnUnauthorizedErrorForUnauthorizedUser() {
      const targets = [
        'groups',
        'groups/1',
        'PUT groups/1',
        'users',
        'users/alice@example.com',
        'PUT users/alice@example.com',
        'projects',
        'server-params'
      ];
      for (const target of targets) {
        let [method, url] = target.split(' ');
        if (!url) {
          method = 'GET';
          url = target;
        }
        // console.log(method, target);
        const data = method.match(/GET|PUT/) ? { a: 10 } : undefined;
        const res = await server.axios.bob.request({
          url: server.url + 'api/admin/' + url,
          method,
          data
        });
        assert.equal(res.status, 401);
        assert.match(res.data.error, /privilege/);
      }
    });
  });

  describe('admin/groups', function _adminGroups() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['groups']);
    });

    it('should return list of groups', async function _shouldReturnListOfGroups() {
      const res = await axios.get(server.url + 'api/admin/groups');
      assert.isArray(res.data.items);
      assert.equal(res.data.items[0].groupName, 'admin');
    });

    it('should return a group', async function _shouldReturnAGroup() {
      const res = await axios.get(server.url + 'api/admin/groups/1');
      assert.equal(res.data.groupName, 'admin');
    });

    it('should return error for nonexistent group', async function _shouldReturnErrorForNonexistentGroup() {
      const res1 = await axios.get(server.url + 'api/admin/groups/7');
      assert.equal(res1.status, 404);
      const res2 = await axios.get(server.url + 'api/admin/groups/bad');
      assert.equal(res2.status, 404);
    });

    it('should update a group', async function _shouldUpdateAGroup() {
      await axios.request({
        method: 'put',
        url: server.url + 'api/admin/groups/1',
        data: { groupName: 'root' }
      });
      const res2 = await axios.get(server.url + 'api/admin/groups/1');
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
      moderateProjects: []
    };

    it('should add a new group', async function _shouldAddANewGroup() {
      const res = await axios.request({
        method: 'post',
        url: server.url + 'api/admin/groups',
        data: basicGroupData
      });
      assert.equal(res.status, 200);
    });

    it('should return error for invalid group update', async function _shouldReturnErrorForInvalidGroupUpdate() {
      const res1 = await axios.request({
        method: 'put',
        url: server.url + 'api/admin/groups/1',
        data: { groupName: 72 }
      });
      assert(res1.status, 400);

      const res2 = await axios.request({
        method: 'put',
        url: server.url + 'api/admin/groups/1',
        data: { groupId: 45 }
      });
      assert.equal(res2.status, 400);
      assert.match(res2.data.error, /primary key/);

      const res3 = await axios.request({
        method: 'post',
        url: server.url + 'api/admin/groups',
        data: { ...basicGroupData, groupId: 77 }
      });
      assert.equal(res3.status, 400);
      assert.match(res3.data.error, /Group ID cannot be specified/);
    });

    it('should return global-privileges', async function _shouldReturnGlobalPrivileges() {
      const res = await axios(server.url + 'api/admin/global-privileges');
      assert.isTrue(res.data.length > 1);
      assert.isTrue(res.data.every(p => p.privilege && p.caption));
    });

    it.skip('should reject unknown field');
  });

  describe('admin/users', function _adminUsers() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['users']);
    });

    it('should return list of users', async function _shouldReturnListOfUsers() {
      const res = await axios.get(server.url + 'api/admin/users');
      assert.isArray(res.data.items);
      assert.isTrue(res.data.items.some(u => u.loginId === 'bob'));
      assert.isFalse(
        res.data.items.some(u => u.password),
        'Result data included password field.'
      );
    });

    it('should return a user', async function _shouldReturnListOfUsers() {
      const res = await axios.get(
        server.url + 'api/admin/users/alice@example.com'
      );
      assert.equal(res.data.loginId, 'alice');
      assert.notExists(res.data.password);
    });

    it('should return error for nonexistent user', async function _shouldReturnRrrorForNonexistentUser() {
      const res = await axios.get(server.url + 'api/admin/user/john@due.com');
      assert(res.status, 404);
    });

    it('should update a user', async function _shouldUpdateAUser() {
      await axios.request({
        method: 'put',
        url: server.url + 'api/admin/users/alice@example.com',
        data: { loginId: 'anastasia' }
      });
      const res2 = await axios.get(
        server.url + 'api/admin/users/alice@example.com'
      );
      assert.equal(res2.data.loginId, 'anastasia');
    });

    it('should return error for invalid user update', async function _shouldReturnErrorForInvalidUserUpdate() {
      const res1 = await axios.request({
        method: 'put',
        url: server.url + 'api/admin/users/alice@example.com',
        data: { groups: ['this-must-not-be', 'strings'] }
      });
      assert.equal(res1.status, 400);

      const res2 = await axios.request({
        method: 'put',
        url: server.url + 'api/admin/users/alice@example.com',
        data: { userEmail: 'alice.new.mail@example.com' }
      });
      assert.equal(res2.status, 400);
      assert.match(res2.data.error, /primary key/);
    });

    it.skip('should reject unknown field');
  });

  describe('admin/projects', function _adminProjects() {
    it('should return list of projects', async function _shouldReturnListOfProjects() {
      const res = await axios.get(server.url + 'api/admin/projects');
      assert.isArray(res.data.items);
      assert.isTrue(res.data.items.some(p => p.projectName === 'Lung nodules'));
    });

    it('should return a project', async function _shouldReturnAProject() {
      const res = await axios.get(
        server.url + 'api/admin/projects/8883fdef6f5144f50eb2a83cd34baa44'
      );
      assert.equal(res.data.projectName, 'Lung nodules');
    });
  });

  describe('admin/plugins', function _adminPlugins() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['pluginDefinitions']);
    });

    it('should return list of plugins', async function _shouldReturnListOfPlugins() {
      const res = await axios.get(server.url + 'api/admin/plugins');
      assert.equal(res.status, 200);
      assert.isArray(res.data.items);
      assert.isTrue(
        res.data.items.some(p => p.pluginName === 'MOCK-VALIDATION-FAILURE')
      );
    });
  });

  describe('admin/server-params', function _adminServerParams() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['serverParams']);
    });

    it('should return parameters', async function _shouldReturnParameters() {
      const res = await axios.get(server.url + 'api/admin/server-params');
      assert.deepEqual(res.data, {
        foo: 'bar',
        color: ['green', 'black', 'blue']
      });
    });

    it('should return one parameter', async function _shouldReturnOneParameter() {
      const res = await axios.get(server.url + 'api/admin/server-params/color');
      assert.deepEqual(res.data, ['green', 'black', 'blue']);
    });

    it('should update one parameter', async function _shouldUpdateOneParameter() {
      const res = await axios.request({
        url: server.url + 'api/admin/server-params/color',
        method: 'put',
        data: ['orange']
      });
      assert.equal(res.status, 204);
      const res2 = await axios.get(server.url + 'api/admin/server-params');
      assert.deepEqual(res2.data.color, ['orange']);
    });

    it('should bulk-update parametes', async function _shouldBulkUpdateParametes() {
      const res = await axios.request({
        url: server.url + 'api/admin/server-params',
        method: 'put',
        data: { foo: 'buz', price: 1980 }
      });
      assert.equal(res.status, 204);
      const res2 = await axios.get(server.url + 'api/admin/server-params');
      assert.deepEqual(res2.data, {
        foo: 'buz',
        color: ['green', 'black', 'blue'],
        price: 1980
      });
    });
  });

  describe('series', function _series() {
    it('should perform search', async function _shouldPerformSearch() {
      const res = await axios.request({
        url: server.url + 'api/series',
        method: 'get'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.items.length, 3);
    });

    it('should return single series information', async function _shouldReturnSingleSeriesInformation() {
      const res = await axios.request({
        url: server.url + 'api/series/111.222.333.444.666',
        method: 'get'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.manufacturer, 'Hatsushiba');
    });

    it('should reject 403 for unauthorized series', async function _shouldReject403ForUnauthorizedSeries() {
      const res = await axios.request({
        url: server.url + 'api/series/111.222.333.444.777',
        method: 'get'
      });
      assert.equal(res.status, 403);
    });

    describe('uploading', function uploading() {
      async function uploadTest(
        file,
        loginName = 'alice',
        domain = 'sirius.org'
      ) {
        const formData = new FormData();
        formData.append('files', fs.createReadStream(file));
        const res = await server.axios[loginName].request({
          method: 'post',
          headers: formData.getHeaders(),
          url: server.url + `api/series/domain/${domain}`,
          data: formData,
          validateStatus: null
        });
        if (res.status === 503) {
          this.skip();
          return;
        }
        return res;
      }

      it('should upload signle DICOM file', async function _shouldUploadSignleDICOMFile() {
        const file = path.join(__dirname, 'dicom', 'CT-MONO2-16-brain.dcm');
        const res = await uploadTest.call(this, file);
        assert.equal(res.status, 200);
      });

      it('should upload zipped DICOM files', async function _shouldUploadZippedDICOMFiles() {
        const file = path.join(__dirname, 'dicom', 'test.zip');
        const res = await uploadTest.call(this, file);
        assert.equal(res.status, 200);
      });

      it('should reject series upload into innaccessible domain', async function _shouldRejectSeriesUploadIntoInnaccessibleDomain() {
        const file = path.join(__dirname, 'dicom', 'CT-MONO2-16-brain.dcm');
        const res = await uploadTest.call(this, file, 'bob');
        assert.equal(res.status, 403);
        assert.match(res.data.error, /You cannot upload to this domain/);
      });
    });
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
                  end: 200
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
        assert.match(res.data.error, /range/);
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
    let jobId;

    after(async () => {
      await testHelper.flush();
    });

    // (alice has sirius.org domain)
    // 111.222.333.444.444: (  1) [sirius.org]
    // 111.222.333.444.555: (150) [sirius.org]
    // 111.222.333.444.666: (100) [sirius.org]
    // 111.222.333.444.777: (236) [vega.org]

    it('should register a new plug-in job', async function _shouldRegisterANewPlugInJob() {
      const priority = 123;
      const pluginJobRequest = {
        pluginId: 'circus-mock/empty',
        series: [
          {
            seriesUid: '111.222.333.444.555'
          }
        ]
      };

      const res = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: { ...pluginJobRequest, priority }
      });
      ({ jobId } = res.data);

      assert.equal(res.status, 200);

      const lastQueueItem = (await csCore.job.list()).slice(-1)[0];
      assert.equal(priority, lastQueueItem.priority);
      assert.equal(jobId, lastQueueItem.jobId);
      assert.deepEqual(lastQueueItem.payload, pluginJobRequest);

      // use partial volume
      const { status } = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId: 'circus-mock/empty',
          series: [
            {
              seriesUid: '111.222.333.444.555',
              partialVolumeDescriptor: {
                start: 25,
                end: 85,
                delta: 3
              }
            }
          ]
        }
      });
      assert.equal(status, 200);
    });

    it('should reject invalid series request', async function _shouldRegisterANewPlugInJob() {
      let { status } = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId: 'circus-mock/empty',
          series: [
            {
              seriesUid: '111.222.333.444.444',
              partialVolumeDescriptor: {
                start: 1,
                end: 10,
                delta: 2
              }
            }
          ],
          priority: 123
        }
      });
      assert.equal(status, 404);

      ({ status } = await axios.request({
        method: 'post',
        url: server.url + 'api/plugin-jobs',
        data: {
          pluginId: 'circus-mock/empty',
          series: [
            {
              seriesUid: '111.222.333.444.777'
            }
          ],
          priority: 123
        }
      }));
      assert.equal(status, 404);
    });

    it('should return a finished plug-in job', async function _shouldReturnAFinishedPlugInJob() {
      await testHelper.tick();
      await testHelper.tack();
      const res = await axios.request({
        url: server.url + `api/plugin-jobs/${jobId}`
      });
      assert.equal(res.data.jobId, jobId);
      assert.equal(res.data.status, 'finished');
      assert.equal(res.status, 200);
    });

    it('should register a new feedback entry', async function _shouldRegisterANewFeedbackEntry() {
      const res = await axios.request({
        url: server.url + `api/plugin-jobs/${jobId}/feedback`,
        method: 'post',
        data: {
          isConsensual: false,
          data: { a: 100 },
          actionLog: []
        }
      });
      assert.equal(res.status, 200);
    });

    it('should return a list of feedback entries', async function _shouldReturnAListOfFeedbackEntries() {
      const res = await axios.request({
        url: server.url + `api/plugin-jobs/${jobId}/feedback`,
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
    let url;
    before(async () => {
      url = server.url + 'api/admin/plugin-job-queue';
      await testHelper.flush();
    });

    const fillQueue = len =>
      new Array(len).fill(0).reduce(
        (p, c, i) =>
          p.then(async () => {
            await testHelper.registerJob({
              jobId: 'job-id-' + (1 + i).toString(),
              pluginId: 'circus-mock/empty',
              userEmail: 'alice.new.mail@example.com'
            });
          }),
        Promise.resolve()
      );

    const check = async (expectedStates, params = {}) => {
      const abbrs = {
        q: 'in_queue',
        p: 'processing',
        f: 'finished',
        // 'failed' (called never on current version)
        // 'invalidated' (called never on current version)
        e: 'error'
      };
      const flipAbbrs = {};
      Object.keys(abbrs).forEach(a => (flipAbbrs[abbrs[a]] = a));

      const res = await axios({ method: 'GET', url, params });
      assert.equal(res.status, 200);
      const fetchedStates = res.data.items.map(i => flipAbbrs[i.status]);

      const stringify = states =>
        states.length.toString() + JSON.stringify(states);

      assert.equal(stringify(expectedStates), stringify(fetchedStates));
      return res;
    };

    it('should return the current queue list', async function _shouldReturnTheCurrentQueueList() {
      await fillQueue(3);
      await check(['q', 'q', 'q']);

      await testHelper.tick();
      await check(['p', 'q', 'q']);
      await testHelper.tack(async () => {
        throw new Error('TEST');
      }); // finished as error
      await check(['q', 'q']);

      await testHelper.tick();
      await check(['p', 'q']);
      await testHelper.tack();
      await check(['q']);

      await testHelper.tick();
      await check(['p']);
      await testHelper.tack();
      await check([]);

      await testHelper.tick();
      await check([]);
      await testHelper.tack();
      await check([]);

      await testHelper.flush();
    });

    it('should return the queues without finished states (finished, error)', async function _shouldReturnTheCurrentQueueList() {
      await fillQueue(2);
      await testHelper.tick();
      await testHelper.tack(async () => {
        throw new Error('TEST');
      });

      await testHelper.tick();
      await testHelper.tack(async () => ({ hoge: 'piyo' }));

      const queuesInMongo = await testHelper.jobListOverview();
      assert.equal(2, queuesInMongo.length);
      await check([]);
      await testHelper.flush();
    });

    it('should return the items which is specified by page and limit', async function shouldReturnTheItemsWhichIsSpecifiedByPageAndLimit() {
      await fillQueue(50);
      await testHelper.tick();

      await check(['p'].concat(new Array(9).fill('q')), { limit: 10, page: 1 });
      await check(['q'].concat(new Array(9).fill('q')), { limit: 10, page: 2 });
      await check(['p'].concat(new Array(29).fill('q')), {
        limit: 30,
        page: 1
      });
      const res = await check(['q'].concat(new Array(19).fill('q')), {
        limit: 30,
        page: 2
      });
      assert.equal(res.data.totalItems, 50);

      await testHelper.flush();
    });

    it('should return the items which is specified by state', async function _shouldReturnTheCurrentQueueList() {
      await fillQueue(5);
      await testHelper.tick();

      await check(['p', 'q'], { limit: 2, page: 1, state: 'all' });
      await check(['q', 'q'], { limit: 2, page: 1, state: 'wait' });
      await check(['p'], { limit: 2, page: 1, state: 'processing' });

      await testHelper.flush();
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

  describe.only('plugins', function _plugins() {
    beforeEach(async function() {
      await test.setUpMongoFixture(server.db, ['pluginDefinitions']);
    });

    it('should return list of all plugins', async function _shouldReturnListOfAllPlugins() {
      const res = await axios.get(server.url + 'api/plugins');
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      assert.isTrue(res.data.some(p => p.pluginName === 'MOCK-VALIDATION-FAILURE'));
    });

    it('should return plugin definition specified by pluginId', async function _shouldReturnPluginDefinitionSpecifiedByPluginId() {
      const res = await axios.get(server.url + 'api/plugins/circus-mock%2Ffails');
      assert.equal(res.status, 200);
      assert.equal(res.data.pluginName, 'MOCK-VALIDATION-FAILURE');
    });
  });

});
