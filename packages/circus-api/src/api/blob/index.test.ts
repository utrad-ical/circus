import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import { createGzip } from 'zlib';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  console.log('beforeAll started');
  try {
    apiTest = await setUpAppForRoutesTest();
    console.log('apiTest initialized:', apiTest);
  } catch (error) {
    console.error('Error during setup:', error);
    throw error;
  }
  console.log('beforeAll completed');
  axios = apiTest.axiosInstances.alice;
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

const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

it('should accept uploading and downloading a blob', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  expect(res.status).toBe(201);
  const res2 = await axios.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  expect(res2.data).toBe('star');
});

it('should accept gzipped data', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip'
    },
    data: createGzip().end('star')
  });
  expect(res.status).toBe(201);
  const res2 = await axios.request({
    method: 'get',
    url: 'api/blob/' + sha1
  });
  expect(res2.data).toBe('star');
});

it('should return 400 on hash mismatch', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/1111222233334444aaaabbbbcccc',
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  expect(res.status).toBe(400);
});

it('should return 404 for nonexistent hash', async () => {
  const res = await axios.get('api/blob/aaabbbcccdddeeefff111222333');
  expect(res.status).toBe(404);
});
