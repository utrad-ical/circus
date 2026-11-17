export async function up(db) {
  const found = await db.listCollections({ name: 'tasks' }).toArray();
  if (found.length) await db.collection('tasks').drop();
}
