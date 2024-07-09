import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import { setUpMongoFixture } from '../../../test/util-mongo';
import status from 'http-status';

let apiTest: ApiTest,
  alice: AxiosInstance,
  bob: AxiosInstance,
  guest: AxiosInstance,
  dave: AxiosInstance,
  frank: AxiosInstance;

beforeAll(async () => {
  try {
    apiTest = await setUpAppForRoutesTest();

    if (typeof apiTest.tearDown !== 'function') {
      console.error('apiTest.tearDown is not a function', apiTest);
      throw new Error('apiTest.tearDown is not a function');
    }

    console.log('apiTest initialized:', apiTest);
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
  ({ alice, bob, guest, dave, frank } = apiTest.axiosInstances);
});

afterAll(async () => {
  try {
    if (apiTest && typeof apiTest.tearDown === 'function') {
      console.log('Calling tearDown');
      await apiTest.tearDown();
      console.log('tearDown called successfully');
    } else {
      console.error('tearDown is not a function or apiTest is undefined');
    }
  } catch (error) {
    console.error('Error during teardown:', error);
    throw error;
  }
});

// (alice belongs to sirius.org domain, and has readPlugin and manageFeedback permissions)
// (bob belongs to vega.org domain, and has readPlugin, executePlugin and inputPersonalFeedback permissions)
// (guest belongs to no domain)
// (dave belongs to sirius.org and vega.org domain, and
//  has readPlugin, executePlugin, manageJobs, inputConsensualFeedback, inputPersonalFeedback, manageFeedback, and viewPersonalInfo permissions)
// (frank belongs to sirius.org and vega.org domain, and has readPlugin permission)

// 111.222.333.444.444: (  1) [sirius.org]
// 111.222.333.444.555: (150) [sirius.org]
// 111.222.333.444.666: (100) [sirius.org]
// 111.222.333.444.777: (236) [vega.org]

describe('plugin-job search', () => {
  test('List plug-in jobs', async () => {
    const res = await dave.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('Filter by patientInfo', async () => {
    const res = await dave.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.age).toBe(20);
  });

  test('Filter by series info', async () => {
    const res = await dave.get('api/plugin-jobs', {
      params: {
        // filter: JSON.stringify({ modality: 'CR' })
        filter: JSON.stringify({
          seriesDate: { $lt: { $date: '2017-10-10T00:00:00Z' } }
        })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(2);
  });

  test('Filter by power user domain', async () => {
    const res = await bob.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(2);
  });

  test('Filter by guest domain', async () => {
    const res = await guest.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('throw 400 if search using patient information for unprivileged user', async () => {
    // Frank has no global privilege `personalInfoView`.
    const res = await frank.get('api/plugin-jobs', {
      params: { filter: { 'patientInfo.patientName': 'Sakura' } }
    });
    expect(res.status).toBe(400);
  });

  test('should not be able to filter by patientInfo if user has no viewPersonalInfo', async () => {
    // Alice has global privilege `personalInfoView` but no viewPersonalInfo for plugins.
    const res = await alice.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('should be searchable if patient information is not used', async () => {
    const res = await frank.get('api/plugin-jobs', {
      params: {
        filter: {
          pluginId:
            'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
        }
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(4);
  });
});

describe('search by mylist', () => {
  afterEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['users', 'groups']);
  });
  const myListId = '01ezahm939cbyfk73g3jhw1d0b';

  test('search succeeds', async () => {
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.patientName).toBe('Koume');
  });

  test('throw 404 if use nonexistent myListId in my list', async () => {
    const nonexistentMyListId = '11111111111111111111111111';
    const res = await dave.get(`api/plugin-jobs/list/${nonexistentMyListId}`);
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('This my list does not exist');
  });

  test('should throw 400 for non-plugin-job mylist type', async () => {
    const caseMyListId = '01ezab6xqfac7hvm5s09yw1g1j';
    const res = await dave.get(`api/plugin-jobs/list/${caseMyListId}`);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('This my list is not for plugin jobs');
  });

  test('should not return results if domain check fails', async () => {
    await apiTest.database.db
      .collection('users')
      .updateOne({ userEmail: 'dave@example.com' }, { $set: { groups: [] } });
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('should not return patient info when personalInfoView = false', async () => {
    await apiTest.database.db
      .collection('users')
      .updateOne(
        { userEmail: 'dave@example.com' },
        { $set: { 'preferences.personalInfoView': false } }
      );
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo).toBe(undefined);
  });

  test('should not return patient info when there is no privileges', async () => {
    await apiTest.database.db
      .collection('groups')
      .updateMany(
        { $or: [{ groupId: 1 }, { groupId: 4 }] },
        { $set: { privileges: [] } }
      );
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo).toBe(undefined);
  });
});

describe('plugin-job registration', () => {
  test('should register a new plug-in job if a user has executePlugin', async () => {
    const res = await dave.request({
      method: 'post',
      url: 'api/plugin-jobs',
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
    expect(res.status).toBe(201);
  });

  test('should not register a new plug-in job if a user has no executePlugin', async () => {
    const res = await frank.request({
      method: 'post',
      url: 'api/plugin-jobs',
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
    expect(res.status).toBe(400);
  });

  test('should reject if series image out of range', async () => {
    // Series image out of range
    const res = await dave.request({
      method: 'post',
      url: 'api/plugin-jobs',
      data: {
        pluginId:
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
        series: [
          {
            seriesUid: '111.222.333.444.444',
            partialVolumeDescriptor: { start: 1, end: 10, delta: 1 }
          }
        ],
        priority: 123
      }
    });
    expect(res.status).toBe(400);
  });

  test('should reject if series lacks PVD', async () => {
    // Lacks partial volume descriptor
    const res = await dave.request({
      method: 'post',
      url: 'api/plugin-jobs',
      data: {
        pluginId:
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
        series: [{ seriesUid: '111.222.333.444.777' }],
        priority: 123
      }
    });
    expect(res.status).toBe(400);
  });

  test('should register a job with automatic PVD', async () => {
    const res = await dave.request({
      method: 'post',
      url: 'api/plugin-jobs',
      data: {
        pluginId:
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            partialVolumeDescriptor: 'auto'
          }
        ]
      }
    });
    expect(res.status).toBe(201);
  });

  test('should reject for unmatched series domain', async () => {
    const res = await bob.request({
      method: 'post',
      url: 'api/plugin-jobs',
      data: {
        pluginId:
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            partialVolumeDescriptor: { start: 1, end: 10, delta: 1 }
          },
          {
            seriesUid: '222.222.333.444.777',
            partialVolumeDescriptor: { start: 1, end: 10, delta: 1 }
          }
        ]
      }
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(
      'All series must belong to the same domain.'
    );
  });

  describe('duplicated jobs', () => {
    const job = {
      pluginId:
        'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
      series: [
        {
          seriesUid: '111.222.333.444.777',
          partialVolumeDescriptor: { start: 3, end: 7, delta: 2 }
        }
      ]
    };
    test('should reject for duplicated job', async () => {
      const res = await bob.post('api/plugin-jobs', job);
      expect(res.status).toBe(400);
      expect(res.data.error).toMatch('duplicate');
    });

    test('should not reject when "force" flag is set', async () => {
      const res = await bob.post('api/plugin-jobs', { ...job, force: true });
      expect(res.status).toBe(201);
    });
  });
});

describe('job cancellation', () => {
  test('cancel a job', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01gr80z2v58f9jytq60snybgfa',
      data: { status: 'cancelled' }
    });
    expect(res.status).toBe(status.NO_CONTENT);
  });

  test('cancellation fails if status is not in_queue', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa',
      data: { status: 'cancelled' }
    });
    expect(res.status).toBe(status.UNPROCESSABLE_ENTITY);
  });
});

describe('job invalidation', () => {
  test('invalidate a job', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01f5dt3qn9877g072t9y7h7pjp',
      data: { status: 'invalidated' }
    });
    expect(res.status).toBe(status.NO_CONTENT);
  });

  test('invalidation fails if status is not in_queue', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te',
      data: { status: 'invalidated' }
    });
    expect(res.status).toBe(status.UNPROCESSABLE_ENTITY);
  });

  test('invalidation fails if a user has no manageJobs', async () => {
    const res = await frank.request({
      method: 'patch',
      url: 'api/plugin-jobs/01f5dt3qn9877g072t9y7h7pjp',
      data: { status: 'invalidated' }
    });
    expect(res.status).toBe(status.UNAUTHORIZED);
  });
});

test('should return a finished plug-in job', async () => {
  const res = await dave.request({
    url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa'
  });
  expect(res.status).toBe(200);
  expect(res.data.jobId).toBe('01dxgwv3k0medrvhdag4mpw9wa');
  expect(res.data.status).toBe('finished');
});

describe('register feedback', () => {
  test('should register a new feedback entry', async () => {
    const res = await dave.request({
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te/feedback/personal',
      method: 'post',
      data: { data: { lesionCandidates: [] }, actionLog: [] }
    });
    expect(res.status).toBe(status.OK);
  });

  test('should return a list of feedback entries', async () => {
    const res = await dave.request({
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te/feedback',
      method: 'get'
    });
    expect(res.status).toBe(status.OK);
    expect(res.data).toHaveLength(1);
  });
});

describe('delete feedback', () => {
  const jobId = '01dxgwv3k0medrvhdag4mpw9wa';

  const getCount = async () => {
    const res = await alice.get(`api/plugin-jobs/${jobId}/feedback`);
    return res.data.length;
  };

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['users', 'pluginJobs']);
  });

  test('delete one feedback', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppnyxbdherkv2krd2n72a`
    );
    expect(res.status).toBe(status.NO_CONTENT);
    expect(await getCount()).toBe(2);
  });

  test('should not delete one feedback if a user has no manageFeedback', async () => {
    const res = await frank.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppnyxbdherkv2krd2n72a`
    );
    expect(res.status).toBe(status.UNAUTHORIZED);
  });

  test('return 404 for non-existing feedback', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/thisfeedbackdoesnotexist`
    );
    expect(res.status).toBe(status.NOT_FOUND);
  });

  test('delete all feedback', async () => {
    const res = await alice.delete(`api/plugin-jobs/${jobId}/feedback/all`);
    expect(res.status).toBe(status.NO_CONTENT);
    expect(await getCount()).toBe(0);
  });

  test('refuse to delete personal feedback when consensual feedback exists', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppgk4kvgx8q5htj5530rp`
    );
    expect(res.status).toBe(status.BAD_REQUEST);
  });
});

describe('get plugin job attachment list', () => {
  test('return file list', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toContain('test.txt');
    expect(res.data).toContain('sub/test2.txt');
  });

  test('reject unauthorized user', async () => {
    const res = await guest.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment'
    );
    expect(res.status).toBe(401);
  });
});

describe('download plugin job attachment files', () => {
  test('return existing file', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/test.txt'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch('text/plain');
    expect(res.data).toBe('This is a test file');
  });

  test('return 404 for nonexistent file', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/dummy.txt'
    );
    expect(res.status).toBe(404);
  });

  test('block directory traversal', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/../something'
    );
    expect(res.status).toBe(400);
  });

  test('reject unauthorized user', async () => {
    const res = await guest.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/test.txt'
    );
    expect(res.status).toBe(401);
  });
});
