import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { deleteAllCollections, usingMongo } from '../test/util-mongo.ts';
// @ts-expect-error The migrations are plain JavaScript without types
import { up } from './migrations/026-move-my-lists.js';

const mongoPromise = usingMongo();
after(async () => (await mongoPromise).dispose());

test('moves my lists from the users into their own documents', async () => {
  const { db } = (await mongoPromise).database;
  await deleteAllCollections(db);
  const created = new Date('2021-01-01T00:00:00Z');
  const added = new Date('2021-02-01T00:00:00Z');
  const editors = [{ type: 'group', groupId: 1 }];
  await db.collection('users').insertMany([
    {
      userEmail: 'alice@example.com',
      myLists: [
        {
          myListId: 'withItems',
          resourceType: 'series',
          name: 'A',
          public: true,
          editors,
          createdAt: created
        },
        {
          myListId: 'withoutItemsDoc',
          resourceType: 'clinicalCases',
          name: 'B',
          public: false,
          editors: [],
          createdAt: created
        }
      ]
    },
    { userEmail: 'bob@example.com', myLists: [] }
  ]);
  await db.collection('users').createIndex({ 'myLists.myListId': 1 });
  await db.collection('myLists').insertMany([
    {
      myListId: 'withItems',
      items: [{ resourceId: 'x', createdAt: added }],
      createdAt: added,
      updatedAt: added
    },
    { myListId: 'orphan', items: [], createdAt: added, updatedAt: added }
  ]);

  await up(db);

  const lists = await db
    .collection('myLists')
    .find({}, { projection: { _id: 0, updatedAt: 0 } })
    .sort({ myListId: 1 })
    .toArray();
  assert.deepEqual(lists, [
    {
      myListId: 'withItems',
      items: [{ resourceId: 'x', createdAt: added }],
      createdAt: created,
      ownerEmail: 'alice@example.com',
      name: 'A',
      resourceType: 'series',
      public: true,
      editors
    },
    {
      myListId: 'withoutItemsDoc',
      ownerEmail: 'alice@example.com',
      name: 'B',
      resourceType: 'clinicalCases',
      public: false,
      editors: [],
      createdAt: created,
      items: []
    }
  ]);
  const users = await db.collection('users').find({}).toArray();
  assert.ok(users.every(u => !('myLists' in u)));
  const userIndexes = (await db.collection('users').indexes()).map(i => i.name);
  assert.ok(!userIndexes.includes('myLists.myListId_1'));
  const listIndexes = (await db.collection('myLists').indexes()).map(
    i => i.name
  );
  assert.ok(listIndexes.includes('ownerEmail_1'));
});
