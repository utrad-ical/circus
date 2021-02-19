import { setUpMongoFixture } from '../../../test/util-mongo';
import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(() => apiTest.tearDown());

test('list all my lists', async () => {
  const res = await ax.bob.get('api/mylists');
  expect(res.status).toBe(200);
  expect(res.data instanceof Array).toBe(true);
});

describe('get one my list', () => {
  test('get', async () => {
    const res = await ax.bob.get('api/mylists/01ewetw0chv8v5vxdtjdf6x9rk');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('name');
  });

  test('404', async () => {
    const res = await ax.bob.get('api/mylists/dummy');
    expect(res.status).toBe(404);
  });
});

describe('create new list', () => {
  test('create new list', async () => {
    const res = await ax.bob.request({
      url: 'api/mylists',
      method: 'post',
      data: { name: 'test' }
    });
    expect(res.status).toBe(200);
    expect(res.data.myListId).toHaveLength(26);
  });

  test('throw 400 when the list name is invalid', async () => {
    const res = await ax.bob.request({
      url: 'api/mylists',
      method: 'post',
      data: { name: '' }
    });
    expect(res.status).toBe(400);
  });
});

describe('put name', () => {
  test('change list name', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}/name`,
      method: 'put',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(204);

    const userEmail = 'bob@example.com';
    const userData = await apiTest.db
      .collection('users')
      .findOne({ userEmail });
    const newList = userData.myLists.filter(
      (myList: any) => myList.myListId === myListId
    )[0];
    expect(newList.name).toBe('new name');
  });

  test('throw 404 for my list the user does not own', async () => {
    const myListId = '01ex36f2n99kjaqvpfrerrsryp';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}/name`,
      method: 'put',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(404);
  });

  test('throw 400 when the new list name is empty text', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}/name`,
      method: 'put',
      data: { name: '' }
    });
    expect(res.status).toBe(400);
  });

  test('throw 400 when the new list name is too long', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const name = 'a'.repeat(65);
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}/name`,
      method: 'put',
      data: { name }
    });
    expect(res.status).toBe(400);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const myListId = 'dummyid';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}/name`,
      method: 'put',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(404);
  });
});

describe('delete list', () => {
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

    const userData = await apiTest.db
      .collection('users')
      .findOne({ userEmail });
    const result = userData.myLists.find(
      (list: any) => list.myListId === myListId
    );
    expect(result).toStrictEqual(undefined);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const myListId = 'dummyid';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'delete'
    });
    expect(res.status).toBe(404);
  });
});

describe('patch list item', () => {
  const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
  const url = `api/mylists/${myListId}/items`;

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.db, ['myLists']);
  });

  test('insert new item into a mylist', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'add',
      resourceIds: [
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
      ]
    });
    expect(res.status).toBe(200);
    expect(res.data.changedCount).toBe(1);
  });

  test('inserting an nonexistent item should cause 404 error', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'add',
      resourceIds: ['this-id-does-not-exist']
    });
    expect(res.status).toBe(404);
  });

  test('inserting a duplicate item must be ignored', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'add',
      resourceIds: [
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr',
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr'
      ]
    });
    expect(res.status).toBe(200);
    expect(res.data.changedCount).toBe(0);
  });

  test('remove item from a mylist', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'remove',
      resourceIds: [
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr'
      ]
    });
    expect(res.status).toBe(200);
    expect(res.data.changedCount).toBe(1);
  });

  test('removeing a nonexistent item should cause no effect', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'remove',
      resourceIds: [
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715',
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
      ]
    });
    expect(res.status).toBe(200);
    expect(res.data.changedCount).toBe(0);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const res = await ax.bob.patch(`api/mylists/dummyId/items`, {
      operation: 'add',
      resourceIds: [
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
      ]
    });
    expect(res.status).toBe(404);
  });
});
