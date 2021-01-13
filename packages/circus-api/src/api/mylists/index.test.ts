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
  const myListId = 'myList1';
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
  const myListId = 'myList1';
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
  const myListId = 'myList2';
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
  const myListId = 'myList1';
  const resourceId = 'resource1';
  const res = await ax.bob.request({
    url: `api/mylists/${myListId}/items/${resourceId}`,
    method: 'delete'
  });
  expect(res.status).toBe(204);

  const myList = await apiTest.db.collection('myLists').findOne({ myListId });
  const result = myList.items.find(i => i === resourceId);
  expect(result).toStrictEqual(undefined);
});
