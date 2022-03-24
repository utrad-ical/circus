export async function up(db) {
  await db
    .collection('onetimeUrls')
    .createIndex({ onetimeUrlId: 1, onetimeString: 1 }, { unique: true });
  await db
    .collection('onetimeUrls')
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 });
}
