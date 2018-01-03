export async function up(db) {
  await db.collection('users').updateMany(
    {},
    {
      $set: {
        'preferences.seriesSearchPresets': [],
        'preferences.caseSearchPresets': []
      }
    }
  );
}
