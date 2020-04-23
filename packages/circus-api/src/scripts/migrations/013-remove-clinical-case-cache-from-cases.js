export async function up(db) {
  await db
    .collection('clinicalCases')
    .updateMany({}, { $unset: { patientInfoCache: true } });
}
