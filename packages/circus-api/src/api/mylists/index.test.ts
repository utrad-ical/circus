import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type * as mongo from 'mongodb';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances, db: mongo.Db;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
  db = apiTest.database.db;
});
after(async () => await apiTest.tearDown());

test('list all my lists', async () => {
  const res = await ax.bob.get('api/mylists');
  assert.equal(res.status, 200);
  assert.equal(res.data instanceof Array, true);
});

describe('get one my list', () => {
  test("get user's own list", async () => {
    const res = await ax.bob.get('api/mylists/01ewetw0chv8v5vxdtjdf6x9rk');
    assert.equal(res.status, 200);
    assert.ok('name' in res.data);
    assert.ok('resourceIds' in res.data);
  });

  test("get other user's list if granted as editor", async () => {
    const res = await ax.bob.get('api/mylists/01ezab6xqfac7hvm5s09yw1g1j');
    assert.equal(res.status, 200);
    assert.equal(res.data.name, "Dave's case list");
  });

  test('throw 404 if nonextent my list id', async () => {
    const res = await ax.bob.get('api/mylists/dummy');
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'This my list does not exist');
  });

  test('throw 401 if not granted as editor', async () => {
    const res = await ax.bob.get('api/mylists/01ez9knaakz9tgd2hpyceagj11');
    assert.equal(res.status, 401);
  });
});

describe('create new list', () => {
  test('create new list', async () => {
    const res = await ax.bob.request({
      url: 'api/mylists',
      method: 'post',
      data: { name: 'test', resourceType: 'clinicalCases', public: false }
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.myListId.length, 26);
  });

  test('throw 400 when the list name is invalid', async () => {
    const res = await ax.bob.request({
      url: 'api/mylists',
      method: 'post',
      data: { name: '' }
    });
    assert.equal(res.status, 400);
  });
});

describe('patch list', () => {
  const userEmail = 'bob@example.com';
  const returnChangedList = async (myListId: string) => {
    const userData = await apiTest.database.db
      .collection('users')
      .findOne({ userEmail });
    const changedList = userData!.myLists.filter(
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
    assert.equal(res.status, 204);

    const changedList = await returnChangedList(myListId);
    assert.equal(changedList.name, 'new name');
  });

  test('change public status from false to true', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/myLists/${myListId}`,
      method: 'patch',
      data: { public: true }
    });
    assert.equal(res.status, 204);

    const changedList = await returnChangedList(myListId);
    assert.equal(changedList.public, true);
  });

  test('throw 401 for my list the user does not own', async () => {
    const myListId = '01ex36f2n99kjaqvpfrerrsryp';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: 'new name' }
    });
    assert.equal(res.status, 401);
  });

  test('throw 400 when the new list name is empty text', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: '' }
    });
    assert.equal(res.status, 400);
  });

  test('throw 400 when the new list name is too long', async () => {
    const myListId = '01ewetw0chv8v5vxdtjdf6x9rk';
    const name = 'a'.repeat(65);
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name }
    });
    assert.equal(res.status, 400);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const myListId = 'dummyid';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'patch',
      data: { name: 'new name' }
    });
    assert.equal(res.status, 404);
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
      assert.equal(res.status, 204);

      const userEmail = 'bob@example.com';
      const userData = await apiTest.database.db
        .collection('users')
        .findOne({ userEmail });
      const newList = userData!.myLists.filter(
        (myList: any) => myList.myListId === myListId
      )[0];
      assert.equal(newList.editors.length, 2);
    });

    test('throw 400 if invalid E-mail address is included', async () => {
      const res = await ax.bob.request({
        url: `api/myLists/${myListId}`,
        method: 'patch',
        data: { editors: [{ type: 'user', userEmail: 'invalid@example.com' }] }
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Invalid email address is included');
    });

    test('throw 400 if invalid group ID is included', async () => {
      const res = await ax.bob.request({
        url: `api/myLists/${myListId}`,
        method: 'patch',
        data: { editors: [{ type: 'group', groupId: 999 }] }
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Invalid group ID is included');
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
    assert.equal(res.status, 204);

    const myList = await apiTest.database.db
      .collection('myLists')
      .findOne({ myListId });
    assert.deepEqual(myList, null);

    const userData = await apiTest.database.db
      .collection('users')
      .findOne({ userEmail });
    const result = userData!.myLists.find(
      (list: any) => list.myListId === myListId
    );
    assert.deepEqual(result, undefined);
  });

  test('throw 401 for my list the user does not own', async () => {
    const myListId = '01ex36f2n99kjaqvpfrerrsryp';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'delete'
    });
    assert.equal(res.status, 401);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const myListId = 'dummyid';
    const res = await ax.bob.request({
      url: `api/mylists/${myListId}`,
      method: 'delete'
    });
    assert.equal(res.status, 404);
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
    assert.equal(res.status, 200);
    assert.equal(res.data.changedCount, 1);
  });

  test('inserting an nonexistent item should cause 404 error', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'add',
      resourceIds: ['this-id-does-not-exist']
    });
    assert.equal(res.status, 404);
  });

  test('inserting a duplicate item must be ignored', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'add',
      resourceIds: [
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr',
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr'
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.changedCount, 0);
  });

  test('remove item from a mylist', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'remove',
      resourceIds: [
        'gfdrjivu4w8p57nv95p7n485n3p891ygy6543wedfuyt67oiulkjhtrw312wergr'
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.changedCount, 1);
  });

  test('removeing a nonexistent item should cause no effect', async () => {
    const res = await ax.bob.patch(url, {
      operation: 'remove',
      resourceIds: [
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715',
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.changedCount, 0);
  });

  test('throw 404 for nonexistent my list id', async () => {
    const res = await ax.bob.patch(`api/mylists/dummyId/items`, {
      operation: 'add',
      resourceIds: [
        'bfaeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715'
      ]
    });
    assert.equal(res.status, 404);
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
      assert.equal(res.status, 200);
      assert.equal(res.data.changedCount, 1);
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
      assert.equal(res.status, 401);
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
    assert.equal(
      responses.every(res => res.status === 201),
      true
    );
    const user = await db
      .collection('users')
      .findOne({ userEmail: 'bob@example.com' });
    assert.equal(user!.myLists.length, 34); // including ones already in fixture
    // myListsの中に30個データがある
  });
});
