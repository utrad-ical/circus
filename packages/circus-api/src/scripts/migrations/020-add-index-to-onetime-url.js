export async function up(db) {
  await db
    .collection('onetimeUrls')
    .createIndex({ onetimeUrlId: 1 }, { unique: true })
    .createIndex({ onetimeString: 1 }, { unique: true });
}
