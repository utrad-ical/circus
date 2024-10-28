export async function up(db) {
  await db
    .collection('pluginJobs')
    .createIndexes([
      { key: { createdAt: 1 } },
      { key: { createdAt: -1 } },
      { key: { pluginId: 1 } }
    ]);
}
