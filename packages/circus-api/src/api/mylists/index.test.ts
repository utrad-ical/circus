import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(() => apiTest.tearDown());

test('create new list', async () => {
  const res = await ax.bob.request({
    url: 'api/mylists',
    method: 'post',
    data: {
      name: 'test'
    }
  });
  expect(res.status).toBe(200);
  expect(res.data.myListId).toHaveLength(26);
});

test('create new item', async () => {
  const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
  const res = await ax.bob.request({
    url: `api/mylists/${myListId}/items`,
    method: 'post',
    data: {
      items: [{ resourceId: 'resourceA' }, { resourceId: 'resourceB' }]
    }
  });
  expect(res.status).toBe(204);
});

test('change list name', async () => {
  const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
  const res = await ax.bob.request({
    url: `api/mylists/${myListId}/name`,
    method: 'put',
    data: { name: 'new name' }
  });
  expect(res.status).toBe(204);

  const userEmail = 'bob@example.com';
  const userData = await apiTest.db.collection('users').findOne({ userEmail });
  const newList = userData.myLists.filter(
    ({ myListId }) => myListId === myListId
  )[0];
  expect(newList.name).toBe('new name');
});

test('delete list', async () => {
  const userEmail = 'bob@example.com';
  const myListId = '01ewetywx9q6s2n5s03y3219ka';
  const res = await ax.bob.request({
    url: `api/mylists/${myListId}`,
    method: 'delete'
  });
  expect(res.status).toBe(204);

  const myList = await apiTest.db.collection('myLists').findOne({ myListId });
  expect(myList).toStrictEqual(null);

  const userData = await apiTest.db.collection('users').findOne({ userEmail });
  const result = userData.myLists.find(l => l.myListId === myListId);
  expect(result).toStrictEqual(undefined);
});

test('delete list item', async () => {
  const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
  const resourceId =
    'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr';
  const res = await ax.bob.request({
    url: `api/mylists/${myListId}/items/${resourceId}`,
    method: 'delete'
  });
  expect(res.status).toBe(204);

  const myList = await apiTest.db.collection('myLists').findOne({ myListId });
  const result = myList.items.find(i => i === resourceId);
  expect(result).toStrictEqual(undefined);
});
