import * as mongo from 'mongodb';
import type { MongoClientPool } from './mongoClientPool.ts';

export const testClientPool = async () => {
  const mongoUrl =
    process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test';
  const connection = await mongo.MongoClient.connect(mongoUrl);
  return {
    connect: async () => connection,
    dispose: () => connection.close(true) // force close
  } as MongoClientPool;
};
