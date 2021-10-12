import { setUpMongoFixture } from '../../../test/util-mongo';
import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(async () => await apiTest.tearDown());

const cid = 'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';

describe('search', () => {
  test('search all', async () => {
    const res = await ax.bob.request({
      url: 'api/cases',
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(4);
    expect(res.data.items.some((item: any) => item.revisions)).toBe(false);
  });

  test('search with patient name', async () => {
    const res = await ax.carol.get('api/cases', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Anzu' })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.patientName).toBe('Anzu');
  });

  test('search with patient name in regex', async () => {
    const res = await ax.carol.get('api/cases', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': { $regex: '^An' } })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.patientName).toBe('Anzu');
  });

  test('search from user with no showPatientInfo privilege', async () => {
    // Bob has no `showPatientInfo` priviledge for the default project,
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
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('throw 400 for wrong request', async () => {
    const res1 = await ax.alice.get('api/cases', {
      params: { filter: 'invalid-json' }
    });
    expect(res1.status).toBe(400);
    expect(res1.data.error).toMatch(/Invalid JSON was passed/);

    const res2 = await ax.alice.get('api/cases', {
      params: { sort: 'invalid-json' }
    });
    expect(res2.status).toBe(400);
    expect(res2.data.error).toMatch(/invalid json/i);

    const res3 = await ax.alice.get('api/cases', {
      params: { sort: '{"field":11}' }
    });
    expect(res3.status).toBe(400);
    expect(res3.data.error).toMatch(/key\/value pair/);
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
    expect(res.status).toBe(201);
    expect(res.data.caseId).toHaveLength(26);
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
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(
      'All series must belong to the same domain.'
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
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(/specified range is invalid/i);
  });

  // TODO: more checks regarding security
});

describe('get one case', () => {
  test('return single case information', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${cid}`,
      method: 'get'
    });
    expect(res.data.projectId).toBe('8883fdef6f5144f50eb2a83cd34baa44');
    expect(res.data).toHaveProperty('revisions');
  });

  test('return 404 for nonexistent case', async () => {
    const res = await ax.bob.request({
      url: 'api/cases/thiscaseisinvalid'
    });
    expect(res.status).toBe(404);
  });

  test('reject revision read access from unauthorized user', async () => {
    const res = await ax.guest.get(`api/cases/${cid}`);
    expect(res.status).toBe(401);
    expect(res.data.error).toMatch(/read/);
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
    expect(res.status).toBe(201);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    expect(res2.data.revisions[1].creator).toBe('bob@example.com');
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

    expect(res.status).toBe(201);
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
    expect(res.status).toBe(400);
  });

  test('reject revision addition from unauthorized user', async () => {
    const res = await ax.guest.request({
      url: `api/cases/${cid}/revision`,
      method: 'post',
      data: { anything: 'can be used' }
    });
    expect(res.status).toBe(401);
    expect(res.data.error).toMatch(/write/);
  });
});

describe('put tags', () => {
  test('change tags', async () => {
    const res = await ax.bob.put(`api/cases/${cid}/tags`, [
      'XXX',
      'YYY',
      'ZZZ'
    ]);
    expect(res.status).toBe(204);
    const { data } = await ax.bob.get(`api/cases/${cid}`);
    expect(data.tags).toEqual(['XXX', 'YYY', 'ZZZ']);
  });

  test('reject invalid tags', async () => {
    const res = await ax.bob.put(`api/cases/${cid}/tags`, [123, 444]);
    expect(res.status).toBe(400);
    const res2 = await ax.bob.put(`api/cases/${cid}/tags`, { some: 'data' });
    expect(res2.status).toBe(400);
  });

  test('reject tag writes from unauthorized user', async () => {
    const res = await ax.guest.put(`api/cases/${cid}/tags`, []);
    expect(res.status).toBe(401);
    expect(res.data.error).toMatch(/write/);
  });
});

describe('search by mylist', () => {
  const myListId = '01ewes10a08z21bjnysd4p1m3f';
  test('search', async () => {
    const res = await ax.bob.get(`api/cases/list/${myListId}`);
    expect(res.status).toBe(200);
    expect(
      res.data.items.some(
        (item: any) =>
          item.caseId ===
          'ankutrdbn53780cmm3489yxj01cmrm0cregtjcmveuhbi987gdhbtrdc780yn3er'
      )
    ).toBe(true);
    expect(res.data.items.some((item: any) => item.revisions)).toBe(false);
  });

  test('return 404 for nonexistent list id', async () => {
    const res = await ax.bob.get('api/cases/list/dummy');
    expect(res.status).toBe(404);
  });

  test('returns 404 for my list of another user', async () => {
    const res = await ax.bob.get('api/cases/list/01ex36f2n99kjaqvpfrerrsryp');
    expect(res.status).toBe(404);
  });

  test('return 400 for my list for different resource type', async () => {
    const res = await ax.bob.get('api/cases/list/01ex36wt9c94s93j0rmk98nsj0');
    expect(res.status).toBe(400);
  });
});

describe('patch tags', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.db, ['clinicalCases']);
  });

  test('add tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'add',
      caseIds: [cid],
      tags: ['ufo', 'party']
    });
    expect(res.status).toBe(204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    expect(res2.data.tags).toEqual(['happy', 'ufo', 'party']);
  });

  test('remove tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'remove',
      caseIds: [cid],
      tags: ['happy']
    });
    expect(res.status).toBe(204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    expect(res2.data.tags).toEqual([]);
  });

  test('set tags', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'set',
      caseIds: [cid],
      tags: ['check']
    });
    expect(res.status).toBe(204);
    const res2 = await ax.bob.get(`api/cases/${cid}`);
    expect(res2.data.tags).toEqual(['check']);
  });

  test('throw for bad operation', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      caseIds: [cid],
      tags: ['check']
    });
    expect(res.status).toBe(400);
  });

  test('throw 404 for nonexistent case', async () => {
    const res = await ax.bob.patch('api/cases/tags', {
      operation: 'remove',
      caseIds: ['thisCaseDoesNotExist'],
      tags: ['check']
    });
    expect(res.status).toBe(404);
  });

  test('reject add-tags from unauthoried user', async () => {
    const res = await ax.guest.patch('api/cases/tags', {
      operation: 'add',
      caseIds: [cid],
      tags: ['check']
    });
    expect(res.status).toBe(401);
  });
});

describe('delete', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.db, ['clinicalCases']);
    await setUpMongoFixture(apiTest.db, ['myLists']);
  });
  const caseId =
    'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr';

  test('delete one case forcibly', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${caseId}?force=1`,
      method: 'delete'
    });
    expect(res.status).toBe(204);
    const myList = await apiTest.db
      .collection('myLists')
      .findOne({ myListId: '01ewes10a08z21bjnysd4p1m3f' });
    expect(myList.items).toEqual(
      expect.not.objectContaining({ resourceId: caseId })
    );
    const aCase = await apiTest.db
      .collection('clinicalCases')
      .findOne({ caseId });
    expect(aCase).toStrictEqual(null);
  });

  test('throw 401 for unauthorized user', async () => {
    const res = await ax.alice.request({
      url: `api/cases/${caseId}`,
      method: 'delete'
    });
    expect(res.status).toBe(401);
    expect(res.data.error).toBe(
      'You do not have "moderate" privilege of this project.'
    );
  });

  test('throw 403 if the case is in some mylist', async () => {
    const res = await ax.bob.request({
      url: `api/cases/${caseId}`,
      method: 'delete'
    });
    expect(res.status).toBe(403);
    expect(res.data.error).toBe("This case is in someone's my list.");
  });
});
