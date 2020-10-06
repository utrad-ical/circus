export async function up(db) {
  const collection = db.collection('tasks');
  await collection.updateMany(
    {},
    { $set: { endedAt: null, finishedMessage: null } }
  );
  await collection.updateMany(
    { errorMessage: '' },
    { $set: { errorMessage: null } }
  );
}
