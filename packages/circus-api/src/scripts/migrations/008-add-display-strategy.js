export async function up(db) {
  await db.collection('pluginDefinitions').updateMany(
    {
      displayStrategy: { $exists: false }
    },
    {
      $set: {
        displayStrategy: []
      }
    }
  );
}
