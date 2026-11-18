import * as mongo from 'mongodb';

/**
 * Moves the attributes of my lists (the name, the owner, etc.) from the
 * `myLists` array of each user into the `myLists` collection, which had
 * only the items, so that each my list is one document.
 * @param {mongo.Db} db
 */
export async function up(db) {
  const users = db.collection('users');
  const myLists = db.collection('myLists');
  const now = new Date();

  const cursor = users.find({ myLists: { $exists: true } });
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    for (const list of user.myLists ?? []) {
      await myLists.updateOne(
        { myListId: list.myListId },
        {
          $set: {
            ownerEmail: user.userEmail,
            name: list.name,
            resourceType: list.resourceType,
            public: list.public ?? false,
            editors: list.editors ?? [],
            createdAt: list.createdAt
          },
          $setOnInsert: { items: [], updatedAt: now }
        },
        { upsert: true }
      );
    }
  }

  // Items without a list cannot be shown to anyone. The lists moved by
  // a previous run that failed halfway already have the owner
  await myLists.deleteMany({ ownerEmail: { $exists: false } });
  await users.updateMany({}, { $unset: { myLists: '' } });

  const oldIndexes = [
    'myLists.myListId_1',
    'myLists.editors.userEmail_1',
    'myLists.editors.groupId_1'
  ];
  const existing = (await users.indexes()).map(i => i.name);
  for (const name of oldIndexes) {
    if (existing.includes(name)) await users.dropIndex(name);
  }

  await myLists.createIndex({ ownerEmail: 1 });
  await myLists.createIndex({ 'editors.userEmail': 1 });
  await myLists.createIndex({ 'editors.groupId': 1 });
  await myLists.createIndex({ 'items.resourceId': 1 });
}
