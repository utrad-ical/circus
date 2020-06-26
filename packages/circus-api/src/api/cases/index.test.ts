import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(async () => await apiTest.tearDown());

const cid = 'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';

it('should perform search', async () => {
  const res = await ax.bob.request({
    url: 'api/cases',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(2);
});

it.skip('search with patient name', async () => {
  const res = await ax.bob.get('api/cases', {
    params: {
      filter: JSON.stringify({ 'patientInfo.patientName': 'Anzu' })
    }
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
  expect(res.data.items[0].patientInfo.patientName).toBe('Anzu');
});

it.skip('search with patient name in regex', async () => {
  const res = await ax.bob.get('api/cases', {
    params: {
      filter: JSON.stringify({ 'patientInfo.patientName': { $regex: '^An' } })
    }
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
  expect(res.data.items[0].patientInfo.patientName).toBe('Anzu');
});

it('should not search result when patientInfo is used.', async () => {
  const res = await ax.bob.get('api/cases', {
    params: {
      filter: JSON.stringify({ 'patientInfo.patientName': { $regex: '^An' } })
    }
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(0);
});

it('should throw 400 for wrong request', async () => {
  const res1 = await ax.alice.get('api/cases', {
    params: { filter: 'invalid-json' }
  });
  expect(res1.status).toBe(400);
  expect(res1.data.error).toMatch('Invalid JSON was passed as the filter.');

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

describe('create', () => {
  it('should create new case', async () => {
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
    expect(res.status).toBe(200);
    expect(res.data.caseId).toHaveLength(26);
  });

  it('should throw error for different domains in one series', async () => {
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
    expect(res.data.error).toMatch('Series must be the same domain.');
  });

  it('should throw for invalid series image range', async () => {
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

it('should return single case information', async () => {
  const res = await ax.bob.request({
    url: `api/cases/${cid}`,
    method: 'get'
  });
  expect(res.data.projectId).toBe('8883fdef6f5144f50eb2a83cd34baa44');
});

it('should return 404 for nonexistent case', async () => {
  const res = await ax.bob.request({
    url: 'api/cases/thiscaseisinvalid'
  });
  expect(res.status).toBe(404);
});

it('should reject revision read access from unauthorized user', async () => {
  const res = await ax.guest.get(`api/cases/${cid}`);
  expect(res.status).toBe(401);
  expect(res.data.error).toMatch(/read/);
});

it('should add a revision', async () => {
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
  expect(res.status).toBe(204);
  const res2 = await ax.bob.get(`api/cases/${cid}`);
  expect(res2.data.revisions[1].creator).toBe('bob@example.com');
});

it('should reject revision addition from unauthorized user', async () => {
  const res = await ax.guest.request({
    url: `api/cases/${cid}/revision`,
    method: 'post',
    data: { anything: 'can be used' }
  });
  expect(res.status).toBe(401);
  expect(res.data.error).toMatch(/write/);
});
