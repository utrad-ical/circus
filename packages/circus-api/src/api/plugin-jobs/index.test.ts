import assert from 'node:assert/strict';
import {
  describe,
  test,
  before,
  after,
  beforeEach,
  afterEach
} from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { TestHttpClient } from '../../test/util-http.ts';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import status from 'http-status';
import { extractPatientIdNameFilter } from './index.ts';

let apiTest: ApiTest,
  alice: TestHttpClient,
  bob: TestHttpClient,
  guest: TestHttpClient,
  dave: TestHttpClient,
  frank: TestHttpClient;

before(async () => {
  apiTest = await setUpAppForRoutesTest();
  ({ alice, bob, guest, dave, frank } = apiTest.clients);
});

after(async () => await apiTest.tearDown());

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
  test('lists plug-in jobs', async () => {
    const res = await dave.get('api/plugin-jobs');
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.data.items), true);
  });

  test('filters by patient information', async () => {
    const res = await dave.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo.age, 20);
  });

  test('filters by series information', async () => {
    const res = await dave.get('api/plugin-jobs', {
      params: {
        // filter: JSON.stringify({ modality: 'CR' })
        filter: JSON.stringify({
          seriesDate: { $lt: { $date: '2017-10-10T00:00:00Z' } }
        })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 2);
  });

  test('returns jobs in accessible domains for a power user', async () => {
    const res = await bob.get('api/plugin-jobs');
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 2);
  });

  test('returns no jobs for a guest without domain access', async () => {
    const res = await guest.get('api/plugin-jobs');
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('returns 400 when a user without permission filters by patient information', async () => {
    // Frank has no global privilege `personalInfoView`.
    const res = await frank.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    assert.equal(res.status, 400);
  });

  test('returns no matches for a patient-information filter without the plug-in privilege', async () => {
    // Alice has global privilege `personalInfoView` but no viewPersonalInfo for plugins.
    const res = await alice.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('allows searches without a patient-information filter', async () => {
    const res = await frank.get('api/plugin-jobs', {
      params: {
        'filter[pluginId]':
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 4);
  });
});

describe('search by mylist', () => {
  afterEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['users', 'groups']);
  });
  const myListId = '01ezahm939cbyfk73g3jhw1d0b';

  test('returns accessible plug-in jobs from the list', async () => {
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo.patientName, 'Koume');
  });

  test('returns 404 for a nonexistent my list', async () => {
    const nonexistentMyListId = '11111111111111111111111111';
    const res = await dave.get(`api/plugin-jobs/list/${nonexistentMyListId}`);
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'This my list does not exist');
  });

  test('returns 400 when the my list contains a different resource type', async () => {
    const caseMyListId = '01ezab6xqfac7hvm5s09yw1g1j';
    const res = await dave.get(`api/plugin-jobs/list/${caseMyListId}`);
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'This my list is not for plugin jobs');
  });

  test('returns an empty list when the user lacks domain access', async () => {
    await apiTest.database.db
      .collection('users')
      .updateOne({ userEmail: 'dave@example.com' }, { $set: { groups: [] } });
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('omits patient information when personalInfoView is disabled', async () => {
    await apiTest.database.db
      .collection('users')
      .updateOne(
        { userEmail: 'dave@example.com' },
        { $set: { 'preferences.personalInfoView': false } }
      );
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo, undefined);
  });

  test('omits patient information without the required privilege', async () => {
    await apiTest.database.db
      .collection('groups')
      .updateMany(
        { $or: [{ groupId: 1 }, { groupId: 4 }] },
        { $set: { privileges: [] } }
      );
    const res = await dave.get(`api/plugin-jobs/list/${myListId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo, undefined);
  });
});

describe('plugin-job registration', () => {
  test('registers a plug-in job for a user with the executePlugin privilege', async () => {
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
    assert.equal(res.status, 201);
  });

  test('rejects job registration without the executePlugin privilege', async () => {
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
    assert.equal(res.status, 401);
    assert.match(res.data.error, /executePlugin/);
  });

  test('rejects a job whose series belongs to an inaccessible domain', async () => {
    for (const partialVolumeDescriptor of [
      { start: 25, end: 85, delta: 3 },
      'auto'
    ]) {
      const res = await bob.post('api/plugin-jobs', {
        pluginId:
          'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
        series: [{ seriesUid: '111.222.333.444.555', partialVolumeDescriptor }]
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'You cannot access this series.');
    }
  });

  test('rejects a job whose image range exceeds the series bounds', async () => {
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
    assert.equal(res.status, 400);
  });

  test('rejects a job whose series is missing a partial volume descriptor', async () => {
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
    assert.equal(res.status, 400);
  });

  test('registers a job with an automatically selected partial volume descriptor', async () => {
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
    assert.equal(res.status, 201);
  });

  test('rejects a job whose series belong to different domains', async () => {
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
    assert.equal(res.status, 400);
    assert.ok(
      res.data.error.includes('All series must belong to the same domain.')
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
    test('rejects a duplicate job', async () => {
      const res = await bob.post('api/plugin-jobs', job);
      assert.equal(res.status, 400);
      assert.ok(res.data.error.includes('duplicate'));
    });

    test('accepts a duplicate job when force is enabled', async () => {
      const res = await bob.post('api/plugin-jobs', { ...job, force: true });
      assert.equal(res.status, 201);
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
    assert.equal(res.status, status.NO_CONTENT);
  });

  test('cancellation fails if status is not in_queue', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa',
      data: { status: 'cancelled' }
    });
    assert.equal(res.status, status.UNPROCESSABLE_ENTITY);
  });
});

describe('job invalidation', () => {
  test('invalidate a job', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01f5dt3qn9877g072t9y7h7pjp',
      data: { status: 'invalidated' }
    });
    assert.equal(res.status, status.NO_CONTENT);
  });

  test('invalidation fails if status is not in_queue', async () => {
    const res = await dave.request({
      method: 'patch',
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te',
      data: { status: 'invalidated' }
    });
    assert.equal(res.status, status.UNPROCESSABLE_ENTITY);
  });

  test('invalidation fails if a user has no manageJobs', async () => {
    const res = await frank.request({
      method: 'patch',
      url: 'api/plugin-jobs/01f5dt3qn9877g072t9y7h7pjp',
      data: { status: 'invalidated' }
    });
    assert.equal(res.status, status.UNAUTHORIZED);
  });
});

test('returns a finished plug-in job', async () => {
  const res = await dave.request({
    url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa'
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.jobId, '01dxgwv3k0medrvhdag4mpw9wa');
  assert.equal(res.data.status, 'finished');
});

describe('register feedback', () => {
  test('registers a new feedback entry', async () => {
    const res = await dave.request({
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te/feedback/personal',
      method: 'post',
      data: { data: { lesionCandidates: [] }, actionLog: [] }
    });
    assert.equal(res.status, status.OK);
  });

  test('returns a list of feedback entries', async () => {
    const res = await dave.request({
      url: 'api/plugin-jobs/01dxgwvhwhyjt8hd4srsf9z4te/feedback',
      method: 'get'
    });
    assert.equal(res.status, status.OK);
    assert.equal(res.data.length, 1);
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

  test('deletes a single feedback entry', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppnyxbdherkv2krd2n72a`
    );
    assert.equal(res.status, status.NO_CONTENT);
    assert.equal(await getCount(), 2);
  });

  test('rejects feedback deletion without the manageFeedback privilege', async () => {
    const res = await frank.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppnyxbdherkv2krd2n72a`
    );
    assert.equal(res.status, status.UNAUTHORIZED);
  });

  test('returns 404 for a nonexistent feedback entry', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/thisfeedbackdoesnotexist`
    );
    assert.equal(res.status, status.NOT_FOUND);
  });

  test('deletes all feedback', async () => {
    const res = await alice.delete(`api/plugin-jobs/${jobId}/feedback/all`);
    assert.equal(res.status, status.NO_CONTENT);
    assert.equal(await getCount(), 0);
  });

  test('refuse to delete personal feedback when consensual feedback exists', async () => {
    const res = await alice.delete(
      `api/plugin-jobs/${jobId}/feedback/01grtppgk4kvgx8q5htj5530rp`
    );
    assert.equal(res.status, status.BAD_REQUEST);
  });
});

describe('get plugin job attachment list', () => {
  test('lists attached files', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment'
    );
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.data), true);
    assert.ok(res.data.includes('test.txt'));
    assert.ok(res.data.includes('sub/test2.txt'));
  });

  test('rejects an unauthorized user', async () => {
    const res = await guest.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment'
    );
    assert.equal(res.status, 401);
  });
});

describe('download plugin job attachment files', () => {
  test('returns an existing attachment', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/test.txt'
    );
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/plain'));
    assert.equal(res.data, 'This is a test file');
  });

  test('returns 404 for a nonexistent attachment', async () => {
    const res = await alice.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/dummy.txt'
    );
    assert.equal(res.status, 404);
  });

  test('rejects an unauthorized user', async () => {
    const res = await guest.get(
      'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/attachment/test.txt'
    );
    assert.equal(res.status, 401);
  });
});

describe('extractPatientIdNameFilter', () => {
  test('returns a filter when customFilter contains a fixed value in patientInfo.patientId without $and', () => {
    const customFilter = { 'patientInfo.patientId': '015' };
    assert.deepEqual(extractPatientIdNameFilter(customFilter), customFilter);
  });

  test('returns null when customFilter contains a fixed value in status without $and', () => {
    const customFilter = { status: 'failed' };
    assert.equal(extractPatientIdNameFilter(customFilter), null);
  });

  test('returns null when $and exists but targetFilter does not contain a fixed value', () => {
    const customFilter = {
      $and: [
        { 'patientInfo.patientId': { $regex: '^0' } },
        { status: 'failed' },
        { createdAt: { $lt: { $date: '2017-10-10T00:00:00Z' } } }
      ]
    };
    assert.equal(extractPatientIdNameFilter(customFilter), null);
  });

  test('returns a filter when $and exists and targetFilter contains a fixed value', () => {
    const customFilter = { $and: [{ 'patientInfo.patientName': 'sakura' }] };
    assert.deepEqual(extractPatientIdNameFilter(customFilter), customFilter);
  });

  test('returns null when customFilter is an empty object', () => {
    assert.equal(extractPatientIdNameFilter({}), null);
  });

  test('returns null when customFilter contains $or condition', () => {
    const customFilter = {
      $or: [
        { 'patientInfo.patientName': 'sakura' },
        { 'patientInfo.patientName': 'umeko' }
      ]
    };
    assert.equal(extractPatientIdNameFilter(customFilter), null);
  });

  test('returns filters when multiple conditions are present in $and', () => {
    const customFilter = {
      $and: [
        { 'patientInfo.patientName': 'sakura' },
        { status: 'failed' },
        { createdAt: { $lt: { $date: '2017-10-10T00:00:00Z' } } },
        { 'patientInfo.age': { $lt: 50 } }
      ]
    };
    const expected = {
      $and: [
        { 'patientInfo.patientName': 'sakura' },
        { 'patientInfo.age': { $lt: 50 } }
      ]
    };
    assert.deepEqual(extractPatientIdNameFilter(customFilter), expected);
  });

  test('returns filters when $and contains nested $and', () => {
    const customFilter = {
      $and: [
        { 'patientInfo.patientName': 'sakura' },
        {
          $or: [
            { status: 'failed' },
            { status: 'cancelled' },
            { 'patientInfo.age': { $lt: 1 } }
          ]
        },
        {
          $and: [
            { 'patientInfo.Id': { $regex: '^0' } },
            { createdAt: { $lt: { $date: '2017-10-10T00:00:00Z' } } }
          ]
        }
      ]
    };
    const expected = {
      $and: [
        { 'patientInfo.patientName': 'sakura' },
        { 'patientInfo.Id': { $regex: '^0' } }
      ]
    };
    assert.deepEqual(extractPatientIdNameFilter(customFilter), expected);
  });
});
