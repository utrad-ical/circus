export async function up(db) {
  await db.collection('myLists').createIndex({ myListId: 1 }, { unique: true });
}
