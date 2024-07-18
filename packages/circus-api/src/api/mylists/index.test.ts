import { setUpMongoFixture } from '../../../test/util-mongo';
import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import mongo from 'mongodb';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances, db: mongo.Db;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
  db = apiTest.database.db;
});
afterAll(async () => await apiTest.tearDown());

test('list all my lists', async () => {
  const res = await ax.bob.get('api/mylists');
  expect(res.status).toBe(200);
  expect(res.data instanceof Array).toBe(true);
});

describe('get one my list', () => {
  test("get user's own list", async () => {
    const res = await ax.bob.get('api/mylists/01ewetw0chv8v5vxdtjdf6x9rk');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('name');
    expect(res.data).toHaveProperty('resourceIds');
  });

  test("get other user's list if granted as editor", async () => {
    const res = await ax.bob.get('api/mylists/01ezab6xqfac7hvm5s09yw1g1j');
    expect(res.status).toBe(200);
    expect(res.data.name).toBe("Dave's case list");
  });

  test('throw 404 if nonextent my list id', async () => {
    const res = await ax.bob.get('api/mylists/dummy');
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('This my list does not exist');
  });

  test('throw 401 if not granted as editor', async () => {
    const res = await ax.bob.get('api/mylists/01ez9knaakz9tgd2hpyceagj11');
    expect(res.status).toBe(401);
  });
});

describe('create new list', () => {
  test('create new list', async () => {
    const res = await ax.bob.request({
      url: 'api/mylists',
      method: 'post',
      data: { name: 'test', resourceType: 'clinicalCases', public: false }
    });
    expect(res.status).toBe(201);
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

describe('patch list', () => {
  const userEmail = 'bob@example.com';
  const returnChangedList = async (myListId: string) => {
    const userData = await apiTest.database.db
      .collection('users')
      .findOne({ userEmail });
    const changedList = userData.myLists.filter(
      (myList: any) => myList.myListId === myListId
    )[0];
    return changedList;
  };

  test('change list name', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(204);

    const changedList = await returnChangedList(myListId);
    expect(changedList.name).toBe('new name');
  });

  test('change public status from false to true', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/myLists/${myListId}`,
      method: 'patch',
      data: { public: true }
    });
    expect(res.status).toBe(204);

    const changedList = await returnChangedList(myListId);
    expect(changedList.public).toBe(true);
  });

  test('throw 401 for my list the user does not own', async () => {
    const myListId = '01ex36f2n99kjaqvpfrerrsryp';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(401);
  });

  test('throw 400 when the new list name is empty text', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: '' }
    });
    expect(res.status).toBe(400);
  });

  test('throw 400 when the new list name is too long', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const name = 'a'.repeat(65);
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name }
    });
    expect(res.status).toBe(400);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const myListId = 'dummyid';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: 'new name' }
    });
    expect(res.status).toBe(404);
  });

  describe('patch list editors', () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';

    test('add editors', async () => {
      const res = await ax.bob.request({
        url: `api/myLists/${myListId}`,
        method: 'patch',
        data: {
          editors: [
            { type: 'user', userEmail: 'alice@example.com' },
            { type: 'group', groupId: 1 }
          ]
        }
      });
      expect(res.status).toBe(204);

      const userEmail = 'bob@example.com';
      const userData = await apiTest.database.db
        .collection('users')
        .findOne({ userEmail });
      const newList = userData.myLists.filter(
        (myList: any) => myList.myListId === myListId
      )[0];
      expect(newList.editors).toHaveLength(2);
    });

    test('throw 400 if invalid E-mail address is included', async () => {
      const res = await ax.bob.request({
        url: `api/myLists/${myListId}`,
        method: 'patch',
        data: { editors: [{ type: 'user', userEmail: 'invalid@example.com' }] }
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid email address is included');
    });

    test('throw 400 if invalid group ID is included', async () => {
      const res = await ax.bob.request({
        url: `api/myLists/${myListId}`,
        method: 'patch',
        data: { editors: [{ type: 'group', groupId: 999 }] }
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid group ID is included');
    });
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

    const myList = await apiTest.database.db
      .collection('myLists')
      .findOne({ myListId });
    expect(myList).toStrictEqual(null);

    const userData = await apiTest.database.db
      .collection('users')
      .findOne({ userEmail });
    const result = userData.myLists.find(
      (list: any) => list.myListId === myListId
    );
    expect(result).toStrictEqual(undefined);
  });

  test('throw 401 for my list the user does not own', async () => {
    const myListId = '01ex36f2n99kjaqvpfrerrsryp';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'delete'
    });
    expect(res.status).toBe(401);
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
    await setUpMongoFixture(db, ['myLists']);
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

  describe("patch other user's list", () => {
    test('insert new item into a mylist of another user', async () => {
      const res = await ax.bob.patch(
        'api/mylists/01ezab6xqfac7hvm5s09yw1g1j/items',
        {
          operation: 'add',
          resourceIds: [
            'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
          ]
        }
      );
      expect(res.status).toBe(200);
      expect(res.data.changedCount).toBe(1);
    });

    test('throw 401 if not granted as editor', async () => {
      const res = await ax.bob.patch(
        'api/mylists/01ex36f2n99kjaqvpfrerrsryp/items',
        {
          operation: 'add',
          resourceIds: [
            'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
          ]
        }
      );
      expect(res.status).toBe(401);
    });
  });
});

describe('transaction test', () => {
  beforeEach(async () => {
    // await setUpMongoFixture(db, ['users', 'myLists']);
  });

  test('avoid collision of many create-list requests', async () => {
    const names = new Array(30).fill(0).map((_, i) => `list${i + 1}`);
    const promises = names.map(name =>
      ax.bob.request({
        url: 'api/mylists',
        method: 'post',
        data: { name, resourceType: 'clinicalCases', public: false }
      })
    );
    const responses = await Promise.all(promises);
    expect(responses.every(res => res.status === 201)).toBe(true);
    const user = await db
      .collection('users')
      .findOne({ userEmail: 'bob@example.com' });
    expect(user.myLists.length).toBe(34); // including ones already in fixture
    // myListsの中に30個データがある
  });
});
