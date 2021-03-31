import mongo from 'mongodb';

/**
 * @param {mongo.Db} db
 */

export async function up(db) {
  const collection = db.collection('users');
  const cursor = collection.find({});

  while (await cursor.hasNext()) {
    const userDoc = await cursor.next();
    const userEmail = userDoc.userEmail;
    const myLists = userDoc.myLists;
    if (myLists.length === 0) continue;
    for (const myList of myLists) {
      if (myList.public === undefined) myList.public = false;
      if (!myList.editor) myList.editor = [];
    }
    db.collection('users').updateOne({ userEmail }, { $set: { myLists } });
  }

  await collection.createIndex({ 'myLists.myListId': 1 });
  await collection.createIndex({ 'myLists.editors.userEmail': 1 });
  await collection.createIndex({ 'myLists.editors.groupId': 1 });
}
