import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

it('should accept uploading and downloading a blob', async () => {
  const res = await axios.request({
    method: 'put',
    url: 'api/blob/' + sha1,
    headers: { 'Content-Type': 'application/octet-stream' },
    data: 'star'
  });
  expect(res.status).toBe(200);
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
  const res = await axios.request({
    method: 'get',
    url: 'api/blob/aaabbbcccdddeeefff111222333'
  });
  expect(res.status).toBe(404);
});
