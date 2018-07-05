import * as mongo from 'mongodb';

export async function getTestCollection(collectionName: string) {
  const mongoUrl =
    process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test';
  const client = await mongo.MongoClient.connect(mongoUrl);
  const collection = client.db().collection(collectionName);
  return { client, collection };
}
