import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { readArchive } from '../../test/util-archive.ts';
import { readFromStreamTillEnd } from '../../test/util-stream.ts';

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
        series: [
          {
            seriesUid: '111.222.333.444.777',
            partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
            labels: []
          }
        ]
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
            partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
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
            partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
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

  test('check attributes with the project schemas', async () => {
    const projects = apiTest.database.db.collection('projects');
    const projectId = '8883fdef6f5144f50eb2a83cd34baa44';
    await projects.updateOne(
      { projectId },
      {
        $set: {
          caseAttributesSchema: {
            type: 'object',
            properties: { smoker: { type: 'boolean' } },
            required: ['smoker']
          },
          labelAttributesSchema: {
            type: 'object',
            properties: { location: { enum: ['MCA', 'ACA'] } }
          }
        }
      }
    );
    try {
      const post = (attributes: object, labelAttributes: object) =>
        ax.bob.post(`api/cases/${cid}/revision`, {
          description: 'Attributes',
          attributes,
          status: 'draft',
          series: [
            {
              seriesUid: '111.222.333.444.777',
              partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
              labels: [
                {
                  type: 'point',
                  name: 'p',
                  attributes: labelAttributes,
                  data: { color: '#ff0000', alpha: 1, location: [1, 2, 3] }
                }
              ]
            }
          ]
        });
      const res1 = await post({}, { location: 'ICA' });
      assert.equal(res1.status, 400);
      assert.deepEqual(
        res1.data.issues.map((i: any) => i.path),
        [
          ['attributes', 'smoker'],
          ['series', 0, 'labels', 0, 'attributes', 'location']
        ]
      );
      const res2 = await post({ smoker: true, other: 1 }, { location: 'MCA' });
      assert.equal(res2.status, 201);
      // A new case does not need the required attributes
      const res3 = await ax.bob.post('api/cases', {
        projectId,
        series: [
          {
            seriesUid: '111.222.333.444.777',
            partialVolumeDescriptor: { start: 1, end: 1, delta: 1 }
          }
        ]
      });
      assert.equal(res3.status, 201);
    } finally {
      await projects.updateOne(
        { projectId },
        { $set: { caseAttributesSchema: {}, labelAttributesSchema: {} } }
      );
    }
  });

  test('reject a revision with invalid labels', async () => {
    const post = (series: any) =>
      ax.bob.post(`api/cases/${cid}/revision`, {
        description: 'Invalid',
        attributes: {},
        status: 'draft',
        series
      });
    const entry = (labels: any[]) => ({
      seriesUid: '111.222.333.444.777',
      partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
      labels
    });
    const voxel = (data: object) => ({
      type: 'voxel',
      data: { color: '#ff0000', alpha: 1, ...data }
    });
    // No series
    assert.equal((await post([])).status, 400);
    // A voxel hash without the location
    const res = await post([
      entry([voxel({ voxels: '5a616841a4fdd6066ee5c7e2d3118e0963ec1fc6' })])
    ]);
    assert.equal(res.status, 400);
    assert.deepEqual(res.data.issues[0].path.slice(0, 5), [
      'series',
      0,
      'labels',
      0,
      'data'
    ]);
    // An unknown property in data
    assert.equal(
      (await post([entry([voxel({ voxels: null, extra: 1 })])])).status,
      400
    );
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
            partialVolumeDescriptor: { start: 1, end: 1, delta: 1 },
            labels: [
              {
                type: 'voxel',
                data: {
                  //invlid voxel id
                  voxels: '7777777777fdd6066ee5c7e2d3118e0963ec1fc6',
                  color: '#00ff00',
                  alpha: 0,
                  origin: [1, 3, 5],
                  size: [7, 11, 13]
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

  test('returns 401 for a private my list of another user', async () => {
    const res = await ax.bob.get('api/cases/list/01ex36f2n99kjaqvpfrerrsryp');
    assert.equal(res.status, 401);
  });

  test('opens a private my list of another user as an editor', async () => {
    const myListId = '01ezab6xqfac7hvm5s09yw1g1j';
    const lists = apiTest.database.db.collection('myLists');
    await lists.updateOne({ myListId }, { $set: { public: false } });
    const res = await ax.bob.get(`api/cases/list/${myListId}`);
    await lists.updateOne({ myListId }, { $set: { public: true } });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
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

describe('export-mhd', () => {
  const seriesUid = '333.444.555.666.777'; // images: 1-10
  const exportCase = (caseId: string, projectId: string) => {
    const revision = {
      creator: 'bob@example.com',
      date: new Date(),
      description: 'Created',
      attributes: {},
      status: 'draft',
      series: [
        {
          seriesUid,
          partialVolumeDescriptor: { start: 3, end: 7, delta: 1 },
          labels: []
        }
      ]
    };
    return {
      caseId,
      projectId,
      latestRevision: revision,
      revisions: [revision],
      tags: [],
      domains: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  before(async () => {
    await apiTest.database.db
      .collection('clinicalCases')
      .insertMany([
        exportCase('export-a', '8883fdef6f5144f50eb2a83cd34baa44'),
        exportCase('export-b', 'another-project')
      ]);
    const series = await apiTest.dicomFileRepository.getSeries(seriesUid);
    for (let i = 1; i <= 10; i++) {
      const file = path.join(
        import.meta.dirname,
        `../../../test/dicom/head-first${String(i).padStart(3, '0')}.dcm`
      );
      await series.save(i, new Uint8Array(fs.readFileSync(file)).buffer);
    }
  });

  after(async () => {
    await apiTest.database.db
      .collection('clinicalCases')
      .deleteMany({ caseId: { $in: ['export-a', 'export-b'] } });
    await apiTest.dicomFileRepository.deleteSeries(seriesUid);
  });

  const download = (params: object, user: keyof typeof ax = 'bob') =>
    ax[user].get('api/cases/export-mhd', {
      params,
      responseType: 'arraybuffer'
    });

  const dimSize = (mhd?: Uint8Array) =>
    /DimSize = (.*)/.exec(new TextDecoder().decode(mhd))![1];

  test('exports the partial volume as zip', async () => {
    const res = await download({
      caseIds: 'export-a',
      compressionFormat: 'zip'
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/zip');
    assert.match(
      res.headers['content-disposition'],
      /attachment; filename="case-export.zip"/
    );
    const files = await readArchive('zip', new Blob([res.data]).stream());
    const json = JSON.parse(
      new TextDecoder().decode(files.get('export-a/data.json'))
    );
    assert.deepEqual(json.originalSeriesMeta, {
      [seriesUid]: { images: '1-10' }
    });
    assert.match(dimSize(files.get('export-a/vol000.mhd')), / 5$/);
  });

  test('exports the whole series as tar.gz', async () => {
    const res = await download({ caseIds: 'export-a', fullOriginalVolume: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/gzip');
    const files = await readArchive('tgz', new Blob([res.data]).stream());
    assert.match(dimSize(files.get('export-a/vol000.mhd')), / 10$/);
  });

  test('reports the progress', async () => {
    const issued = await ax.bob.post('api/progress', {});
    const { progressId } = issued.data;
    const sse = await ax.bob.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    const events = readFromStreamTillEnd(sse.data as Readable);
    const res = await download({ caseIds: 'export-a', progressId });
    assert.equal(res.status, 200);
    assert.match(
      await events,
      /event: finish\ndata: \{"message":"Packed 1 case\(s\)."\}/
    );
  });

  test('reports an error before the download in the progress', async () => {
    const issued = await ax.bob.post('api/progress', {});
    const { progressId } = issued.data;
    const res = await download({ caseIds: 'export-a,export-b', progressId });
    assert.equal(res.status, 401);
    const sse = await ax.bob.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    assert.match(
      await readFromStreamTillEnd(sse.data as Readable),
      /event: error\ndata: \{"message":"You do not have enough read privilege/
    );
  });

  test('reports an invalid query in the progress', async () => {
    const issued = await ax.bob.post('api/progress', {});
    const { progressId } = issued.data;
    const caseIds = Array.from({ length: 101 }, (_, i) => `c${i}`).join(',');
    const res = await download({ caseIds, progressId });
    assert.equal(res.status, 400);
    const sse = await ax.bob.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    assert.match(
      await readFromStreamTillEnd(sse.data as Readable),
      /event: error\ndata: \{"message":"Validation failed: caseIds: /
    );
  });

  test('rejects invalid queries', async () => {
    const caseIds = Array.from({ length: 101 }, (_, i) => `c${i}`).join(',');
    for (const params of [
      { caseIds },
      { caseIds: 'export-a,export-b', revisionIndex: 0 },
      { caseIds: 'export-a', fullOriginalVolume: 'true' },
      { caseIds: 'export-a', unknown: 1 },
      { caseIds: 'nonexistent' },
      { caseIds: 'export-a', revisionIndex: 1 }
    ]) {
      const res = await download(params);
      assert.equal(res.status, 400, JSON.stringify(params));
    }
  });

  test('rejects users without enough privileges', async () => {
    const res1 = await download({ caseIds: 'export-a' }, 'alice');
    assert.equal(res1.status, 401); // no downloadVolume
    const res2 = await download({ caseIds: 'export-a,export-b' });
    assert.equal(res2.status, 401); // cannot read the project
  });

  test("rejects someone else's progress ID", async () => {
    const issued = await ax.carol.post('api/progress', {});
    const res = await download({
      caseIds: 'export-a',
      progressId: issued.data.progressId
    });
    assert.equal(res.status, 400);
  });
});
