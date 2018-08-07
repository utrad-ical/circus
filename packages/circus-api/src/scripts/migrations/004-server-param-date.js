export async function up(db) {
  await db.collection('serverParams').updateMany(
    { craetedAt: { $exists: false } },
    {
      $set: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  );
}
