export async function up(db) {
  await db
    .collection('pluginDefinitions')
    .updateMany(
      { type: 'CAD+remote' },
      { $set: { 'runConfiguration.parameters.timeout': 300 } }
    );
}
