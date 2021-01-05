export async function up(db) {
  const collection = db.collection('users');
  await collection.updateMany(
    { myLists: { $exists: false } },
    { $set: { myLists: [] } }
  );
}
