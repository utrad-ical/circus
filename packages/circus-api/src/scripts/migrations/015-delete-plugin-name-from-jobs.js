export async function up(db) {
  await db
    .collection('pluginJobs')
    .updateMany({}, { $unset: { pluginName: 1, pluginVersion: 1 } });
}
