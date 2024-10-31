export async function up(db) {
  await db
    .collection('series')
    .createIndexes([
      { key: { 'patientInfo.patientId': 1 } },
      { key: { 'patientInfo.patientName': 1 } }
    ]);
}
