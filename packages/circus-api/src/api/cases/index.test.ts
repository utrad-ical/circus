import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
after(async () => await apiTest.tearDown());

const cid = 'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';

describe('search', () => {
  test('search all', async () => {
    const res = await ax.bob.request({
      url: 'api/cases',
      method: 'get'
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 4);
    assert.equal(
      res.data.items.some((item: any) => item.revisions),
      false
    );
  });

  test('search with patient name', async () => {
    const res = await ax.carol.get('api/cases', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Anzu' })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo.patientName, 'Anzu');
  });

  test('search with patient name in regex', async () => {
    const res = await ax.carol.get('api/cases', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': { $regex: '^An' } })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo.patientName, 'Anzu');
  });

  test('throw 400 if search using patient information for unprivileged user', async () => {
    // Frank has no global privilege `personalInfoView`.
    const res = await ax.frank.get('api/cases', {
      params: { filter: JSON.stringify({ 'patientInfo.patientName': 'Anzu' }) }
    });
    assert.equal(res.status, 400);
  });

  test('should be searchable if patient information is not used', async () => {
    const res = await ax.frank.get('api/cases', {
      params: { filter: JSON.stringify({ caseId: cid }) }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
  });

  test('search from user with no viewPersonalInfo privilege', async () => {
    // Bob has no `viewPersonalInfo` privilege for the default project,
    // so the results from this project will be excluded.
    const res = await ax.bob.get('api/cases', {
      params: {
        filter: JSON.stringify({
          $and: [
            {
              caseId:
                'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b'
            },
            { 'patientInfo.patientName': 'Anzu' }
          ]
        })
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('throw 400 for wrong request', async () => {
    const res1 = await ax.alice.get('api/cases', {
      params: { filter: 'invalid-json' }
    });
    assert.equal(res1.status, 400);
    assert.match(res1.data.error, /Invalid JSON was passed/);

    const res2 = await ax.alice.get('api/cases', {
      params: { sort: 'invalid-json' }
    });
    assert.equal(res2.status, 400);
    assert.match(res2.data.error, /invalid json/i);

    const res3 = await ax.alice.get('api/cases', {
      params: { sort: '{"field":11}' }
    });
    assert.equal(res3.status, 400);
    assert.match(res3.data.error, /key\/value pair/);
  });
});

describe('create', () => {
  test('create new case', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/',
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
    assert.equal(res.status, 201);
    assert.equal(res.data.caseId.length, 26);
  });

  test('throw error for different domains in one series', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/',
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
          },
          {
            seriesUid: '222.222.333.444.777',
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
    assert.equal(res.status, 400);
    assert.ok(
      res.data.error.includes('All series must belong to the same domain.')
    );
  });

  test('throw for invalid series image range', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/',
      method: 'post',
      data: {
        projectId: '8883fdef6f5144f50eb2a83cd34baa44',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            // This is out of bounds!
            partialVolumeDescriptor: { start: 1, end: 500, delta: 1 }
          }
        ],
        tags: []
      }
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /specified range is invalid/i);
  });

  // TODO: more checks regarding security
});

describe('get one case', () => {
  test('return single case information', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}`,
      method: 'get'
    });
    assert.equal(res.data.projectId, '8883fdef6f5144f50eb2a83cd34baa44');
    assert.ok('revisions' in res.data);
  });

  test('return 404 for nonexistent case', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/thiscaseisinvalid'
    });
    assert.equal(res.status, 404);
  });

  test('reject revision read access from unauthorized user', async () => {
    const res = await ax.guest.get(`api/cases/${cid}`);
    assert.equal(res.status, 401);
    assert.match(res.data.error, /read/);
  });
});

describe('add revision', () => {
  test('add a revision', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: {
        description: 'Add something',
        attributes: {},
        status: 'for-review',
        series: []
      }
    });
    assert.equal(res.status, 201);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    assert.equal(res2.data.revisions[1].creator, 'bob@example.com');
  });

  test('add a revision with labels', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: {
        description: 'Add labels',
        attributes: {},
        status: 'for-review',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            labels: [
              {
                type: 'voxel',
                data: {
                  voxels: '5a616841a4fdd6066ee5c7e2d3118e0963ec1fc6',
                  color: '#00ff00',
                  alpha: 1,
                  origin: [224, 183, 50],
                  size: [64, 47, 17]
                },
                attributes: {
                  fusiform: false,
                  location: 'A-com',
                  laterality: 'Right'
                }
              },
              {
                type: 'cuboid',
                data: {
                  color: '#00ff00',
                  alpha: 0,
                  min: [1, 3, 5],
                  max: [7, 11, 13]
                },
                name: 'cuboid 1'
              },
              {
                type: 'rectangle',
                data: {
                  color: '#00ff00',
                  alpha: 0,
                  min: [1, 3],
                  max: [7, 11],
                  z: 5
                },
                name: ''
              },
              {
                type: 'polyline',
                data: {
                  color: '#ff00ff',
                  alpha: 0,
                  points: [
                    [60, 10],
                    [10, 100],
                    [140, 30],
                    [20, 30],
                    [120, 120]
                  ],
                  z: 30
                },
                name: ''
              },
              {
                type: 'point',
                data: {
                  color: '#00ff00',
                  alpha: 1,
                  location: [224, 183, 50]
                },
                name: ''
              },
              {
                type: 'ruler',
                data: {
                  color: '#00ff00',
                  alpha: 1,
                  section: {
                    origin: [0, 0, 30],
                    xAxis: [50, 0, 0],
                    yAxis: [0, 50, 0]
                  },
                  start: [10, 10, 30],
                  end: [30, 30, 30]
                },
                name: ''
              }
            ]
          }
        ]
      }
    });

    assert.equal(res.status, 201);
  });

  test('reject revision addition with invalid labels', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: {
        description: 'Add labels',
        attributes: {},
        status: 'for-review',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            labels: [
              {
                type: 'rectangle',
                data: {
                  voxels: '5a616841a4fdd6066ee5c7e2d3118e0963ec1fc6',
                  color: '#00ff00',
                  alpha: 0,
                  min: [1, 3, 5],
                  max: [7, 11, 13]
                }
              }
            ]
          }
        ]
      }
    });
    assert.equal(res.status, 400);
  });

  test('reject revision addition with nonexistent voxel', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: {
        description: 'Add labels',
        attributes: {},
        status: 'for-review',
        series: [
          {
            seriesUid: '111.222.333.444.777',
            labels: [
              {
                type: 'voxel',
                data: {
                  //invlid voxel id
                  voxels: '7777777777fdd6066ee5c7e2d3118e0963ec1fc6',
                  color: '#00ff00',
                  alpha: 0,
                  min: [1, 3, 5],
                  max: [7, 11, 13]
                }
              }
            ]
          }
        ]
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.data.error.includes('Some voxel data are missing'));
  });

  test('reject revision addition from unauthorized user', async () => {
    const res = await ax.guest.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: { anything: 'can be used' }
    });
    assert.equal(res.status, 401);
    assert.match(res.data.error, /write/);
  });
});

describe('put tags', () => {
  test('change tags', async () => {
    const res = await ax.bob.put(`api/cases/${cid}/tags`, [
      'XXX',
      'YYY',
      'ZZZ'
    ]);
    assert.equal(res.status, 204);
    const { data } = await ax.bob.get(`api/cases/${cid}`);
    assert.deepEqual(data.tags, ['XXX', 'YYY', 'ZZZ']);
  });

  test('reject invalid tags', async () => {
    const res = await ax.bob.put(`api/cases/${cid}/tags`, [123, 444]);
    assert.equal(res.status, 400);
    const res2 = await ax.bob.put(`api/cases/${cid}/tags`, { some: 'data' });
    assert.equal(res2.status, 400);
  });

  test('reject tag writes from unauthorized user', async () => {
    const res = await ax.guest.put(`api/cases/${cid}/tags`, []);
    assert.equal(res.status, 401);
    assert.match(res.data.error, /write/);
  });
});

describe('search by mylist', () => {
  const myListId = '01ewes10a08z21bjnysd4p1m3f';
  test('search', async () => {
    const res = await ax.bob.get(`api/cases/list/${myListId}`);
    assert.equal(res.status, 200);
    assert.equal(
      res.data.items.some(
        (item: any) =>
          item.caseId ===
          'ankutrdbn53780cmm3489yxj01cmrm0cregtjcmveuhbi987gdhbtrdc780yn3er'
      ),
      true
    );
    assert.equal(
      res.data.items.some((item: any) => item.revisions),
      false
    );
  });

  test('return 404 for nonexistent list id', async () => {
    const res = await ax.bob.get('api/cases/list/dummy');
    assert.equal(res.status, 404);
  });

  test('returns 404 for my list of another user', async () => {
    const res = await ax.bob.get('api/cases/list/01ex36f2n99kjaqvpfrerrsryp');
    assert.equal(res.status, 404);
  });

  test('return 400 for my list for different resource type', async () => {
    const res = await ax.bob.get('api/cases/list/01ex36wt9c94s93j0rmk98nsj0');
    assert.equal(res.status, 400);
  });
});

describe('patch tags', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['clinicalCases']);
  });

  test('add tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'add',
      caseIds: [cid],
      tags: ['ufo', 'party']
    });
    assert.equal(res.status, 204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    assert.deepEqual(res2.data.tags, ['happy', 'ufo', 'party']);
  });

  test('remove tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'remove',
      caseIds: [cid],
      tags: ['happy']
    });
    assert.equal(res.status, 204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    assert.deepEqual(res2.data.tags, []);
  });

  test('set tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'set',
      caseIds: [cid],
      tags: ['check']
    });
    assert.equal(res.status, 204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    assert.deepEqual(res2.data.tags, ['check']);
  });

  test('throw for bad operation', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      caseIds: [cid],
      tags: ['check']
    });
    assert.equal(res.status, 400);
  });

  test('throw 404 for nonexistent case', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'remove',
      caseIds: ['thisCaseDoesNotExist'],
      tags: ['check']
    });
    assert.equal(res.status, 404);
  });

  test('reject add-tags from unauthoried user', async () => {
    const res = await ax.guest.patch('api/cases/tags', {
      operation: 'add',
      caseIds: [cid],
      tags: ['check']
    });
    assert.equal(res.status, 401);
  });
});

describe('delete', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['clinicalCases']);
    await setUpMongoFixture(apiTest.database.db, ['myLists']);
  });
  const caseId =
    'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr';

  test('delete one case forcibly', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${caseId}?force=1`,
      method: 'delete'
    });
    assert.equal(res.status, 204);
    const myList = await apiTest.database.db
      .collection('myLists')
      .findOne({ myListId: '01ewes10a08z21bjnysd4p1m3f' });
    assert.ok(!myList!.items.some((item: any) => item.resourceId === caseId));
    const aCase = await apiTest.database.db
      .collection('clinicalCases')
      .findOne({ caseId });
    assert.deepEqual(aCase, null);
  });

  test('throw 401 for unauthorized user', async () => {
    const res = await ax.alice.request({
      url: `api/cases/${caseId}`,
      method: 'delete'
    });
    assert.equal(res.status, 401);
    assert.equal(
      res.data.error,
      'You do not have "moderate" privilege of this project.'
    );
  });

  test('throw 403 if the case is in some mylist', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${caseId}`,
      method: 'delete'
    });
    assert.equal(res.status, 403);
    assert.equal(res.data.error, "This case is in someone's my list.");
  });

  test('throw 404 for nonexistent caseId', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/nonexistentCaseId',
      method: 'delete'
    });
    assert.equal(res.status, 404);
  });

  test('transaction tests', async () => {
    const promise = () => {
      return ax.bob.request({
        url: `api/cases/${caseId}?force=1`,
        method: 'delete'
      });
    };
    const arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(promise());
    }
    try {
      await Promise.all(arr);
    } catch (err) {
      console.log(err);
    }
  });
});
