export async function up(db) {
  await db.collection('projects').updateMany(
    {},
    {
      $set: {
        caseAttributesSchema: {},
        labelAttributesSchema: {}
      }
    }
  );
}
