export async function up(db) {
  await db.collection('clinicalCases').updateMany(
    {},
    {
      $unset: {
        'revisions.$[].series.$[].images': true,
        'latestRevision.series.$[].images': true
      }
    }
  );
}
