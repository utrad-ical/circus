export async function up(db) {
  const collection = db.collection('users');
  await collection.updateMany(
    { 'myLists.public': { $exists: false } },
    { $set: { 'myLists.public': false } }
  );
  await collection.updateMany(
    { 'myLists.editor': { $exists: false } },
    { $set: { 'myLists.editor': [] } }
  );
  await collection.createIndex({ 'myLists.myListId': 1 });
  await collection.createIndex({ 'myLists.editors.userEmail': 1 });
}
