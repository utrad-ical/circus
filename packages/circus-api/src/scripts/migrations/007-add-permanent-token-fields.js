export async function up(db) {
  await db.collection('tokens').updateMany(
    {
      permanentTokenId: { $exists: false }
    },
    {
      $set: {
        permanentTokenId: null,
        permanentTokenDescription: null
      }
    }
  );
}
