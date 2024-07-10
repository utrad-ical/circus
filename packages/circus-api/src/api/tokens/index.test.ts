import { AxiosInstance } from 'axios';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';
import httpStatus from 'http-status';

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

test('Create / search / delete token', async () => {
  const res1 = await axios.post('/api/tokens', { description: 'stella' });
  expect(res1.status).toBe(httpStatus.CREATED);
  const tokenId = res1.data.tokenId;

  const res2 = await axios.get('/api/tokens');
  expect(res2.status).toBe(httpStatus.OK);
  expect(res2.data).toMatchObject({ items: [{ description: 'stella' }] });

  const res3 = await axios.delete(`/api/tokens/${tokenId}`);
  expect(res3.status).toBe(httpStatus.NO_CONTENT);
});
