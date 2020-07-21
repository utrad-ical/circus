import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

// (alice has sirius.org domain)
// 111.222.333.444.444: (  1) [sirius.org]
// 111.222.333.444.555: (150) [sirius.org]
// 111.222.333.444.666: (100) [sirius.org]
// 111.222.333.444.777: (236) [vega.org]

describe('plugin-job search', () => {
  test('List plug-in jobs', async () => {
    const res = await axios.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('Filter by patientInfo', async () => {
    const res = await axios.get('api/plugin-jobs', {
      params: {
        filter: JSON.stringify({ 'patientInfo.patientName': 'Sakura' })
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.age).toBe(20);
  });

  test('Filter by power user domain', async () => {
    axios = apiTest.axiosInstances.bob;
    const res = await axios.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    axios = apiTest.axiosInstances.alice;
  });

  test('Filter by guest domain', async () => {
    axios = apiTest.axiosInstances.guest;
    const res = await axios.get('api/plugin-jobs');
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
    axios = apiTest.axiosInstances.alice;
  });
});

describe('plugin-job registration', () => {
  test('should register a new plug-in job', async () => {
    const res = await axios.request({
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
    expect(res.status).toBe(200);
  });

  test('should reject if series image out of range', async () => {
    // Series image out of range
    const res1 = await axios.request({
      method: 'post',
      url: 'api/plugin-jobs',
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
    expect(res1.status).toBe(400);
  });

  test('should reject if series lacks PVD', async () => {
    // Lacks partial volume descriptor
    const res2 = await axios.request({
      method: 'post',
      url: 'api/plugin-jobs',
      data: {
        pluginId: 'circus-mock/empty',
        series: [{ seriesUid: '111.222.333.444.777' }],
        priority: 123
      }
    });
    expect(res2.status).toBe(400);
  });

  test('should reject if difference series domain', async () => {
    axios = apiTest.axiosInstances.bob;
    const res3 = await axios.request({
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
    expect(res3.data.error).toMatch('Series must be the same domain.');
  });

  test('should return a finished plug-in job', async () => {
    const res = await axios.request({
      url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa'
    });
    expect(res.data.jobId).toBe('01dxgwv3k0medrvhdag4mpw9wa');
    expect(res.data.status).toBe('finished');
    expect(res.status).toBe(200);
  });
});

describe('feedback', () => {
  test('should register a new feedback entry', async () => {
    const res = await axios.request({
      url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback/personal',
      method: 'post',
      data: { lesionCandidates: [] }
    });
    expect(res.status).toBe(200);
  });

  test('should return a list of feedback entries', async () => {
    const res = await axios.request({
      url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback',
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(1);
  });
});
