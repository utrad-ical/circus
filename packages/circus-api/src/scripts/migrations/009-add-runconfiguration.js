export async function up(db) {
  await db.collection('pluginDefinitions').updateMany(
    {
      runConfiguration: { $exists: false }
    },
    {
      $set: {
        runConfiguration: { timeout: 900, gpus: '' }
      }
    }
  );
}
