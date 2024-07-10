import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { setUpMongoFixture } from '../../../../test/util-mongo';
import { AxiosInstance } from 'axios';

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

beforeEach(async () => {
  await setUpMongoFixture(apiTest.database.db, ['serverParams']);
});

it('should return parameters', async () => {
  const res = await axios.get('api/admin/server-params');
  expect(res.data).toEqual({
    foo: 'bar',
    color: ['green', 'black', 'blue'],
    defaultDomain: 'default'
  });
});

it('should return one parameter', async () => {
  const res = await axios.get('api/admin/server-params/color');
  expect(res.data).toEqual(['green', 'black', 'blue']);
});

it('should update one parameter', async () => {
  const res = await axios.request({
    url: 'api/admin/server-params/color',
    method: 'put',
    data: ['orange']
  });
  expect(res.status).toBe(204);
  const res2 = await axios.get('api/admin/server-params');
  expect(res2.data.color).toEqual(['orange']);
});

it('should bulk-update parametes', async () => {
  const res = await axios.request({
    url: 'api/admin/server-params',
    method: 'put',
    data: { foo: 'buz', price: 1980 }
  });
  expect(res.status).toBe(204);
  const res2 = await axios.get('api/admin/server-params');
  expect(res2.data).toEqual({
    foo: 'buz',
    color: ['green', 'black', 'blue'],
    defaultDomain: 'default',
    price: 1980
  });
});
