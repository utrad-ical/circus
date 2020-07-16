export async function up(db) {
  await db.collection('series').createIndex({ seriesUid: 1 }, { unique: true });
  await db.collection('pluginJobs').createIndex({ jobId: 1 }, { unique: true });
  await db
    .collection('clinicalCases')
    .createIndex({ caseId: 1 }, { unique: true });
  await db.collection('users').createIndex({ loginId: 1 }, { unique: true });
}
