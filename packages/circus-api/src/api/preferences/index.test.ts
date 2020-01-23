import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

it('should return the preference of the current user', async () => {
  const res = await axios.get('api/preferences');
  expect(res.data.theme).toBe('mode_white');
});

it('should modify the preference of the current user using PUT', async () => {
  const res1 = await axios.request({
    url: 'api/preferences',
    method: 'put',
    data: {
      theme: 'mode_black',
      personalInfoView: false,
      seriesSearchPresets: [],
      caseSearchPresets: [],
      pluginJobSearchPresets: []
    }
  });
  expect(res1.status).toBe(204);
  const res2 = await axios.get('api/preferences');
  expect(res2.data.theme).toBe('mode_black');
});

it('should modify the preference of the current user using PATCH', async () => {
  const res1 = await axios.request({
    url: 'api/preferences',
    method: 'patch',
    data: { theme: 'mode_black' }
  });
  expect(res1.status).toBe(204);
  const res2 = await axios.get('api/preferences');
  expect(res2.data.theme).toBe('mode_black');
});

it('should reject invalid preference update', async () => {
  const res = await axios.request({
    url: 'api/preferences',
    method: 'put',
    data: { theme: 'mode_pink', personalInfoView: false }
  });
  expect(res.status).toBe(400);
});
