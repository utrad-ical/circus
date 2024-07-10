import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    axios = apiTest.axiosInstances.alice;
    console.log('apiTest initialized:', apiTest);
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
  console.log('beforeAll completed');
});
afterAll(async () => {
  console.log('afterAll started');
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
  console.log('afterAll completed');
});

test('return the preference of the current user', async () => {
  const res = await axios.get('api/preferences');
  expect(res.data.theme).toBe('mode_white');
});

describe('PATCH', () => {
  test('modify the preference', async () => {
    const res1 = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_black' }
    });
    expect(res1.status).toBe(204);
    const res2 = await axios.get('api/preferences');
    expect(res2.data.theme).toBe('mode_black');
  });

  test('reject invalid preference update', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { theme: 'mode_pink', personalInfoView: false }
    });
    expect(res.status).toBe(400);
  });

  test('reject nonexistent preference key', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: { pineapple: true }
    });
    expect(res.status).toBe(400);
  });

  test('reject empty object', async () => {
    const res = await axios.request({
      url: 'api/preferences',
      method: 'patch',
      data: {}
    });
    expect(res.status).toBe(400);
  });
});
