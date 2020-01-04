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

it('should register a new plug-in job', async () => {
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

it('should reject invalid series request', async () => {
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

it('should return a finished plug-in job', async () => {
  const res = await axios.request({
    url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa'
  });
  expect(res.data.jobId).toBe('01dxgwv3k0medrvhdag4mpw9wa');
  expect(res.data.status).toBe('finished');
  expect(res.status).toBe(200);
});

it('should register a new feedback entry', async () => {
  const res = await axios.request({
    url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback/personal',
    method: 'post',
    data: { lesionCandidates: [] }
  });
  expect(res.status).toBe(200);
});

it('should return a list of feedback entries', async () => {
  const res = await axios.request({
    url: 'api/plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa/feedback',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data).toHaveLength(1);
});
