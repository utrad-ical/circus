import * as mongo from 'mongodb';
import type { MongoClientPool } from './mongoClientPool.ts';

/**
 * Returns the MongoDB connection string for cs-core tests.
 * `CIRCUS_MONGO_TEST_URL` is shared with circus-api tests,
 * so only the server part is taken from it and a separate database is used.
 * Otherwise, the two test suites overwrite the same collections
 * (e.g., `pluginDefinitions`) of each other.
 */
export const testMongoUrl = (
  baseUrl = process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test'
) =>
  baseUrl.replace(
    /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?/,
    '$1/cs-core-test'
  );

export const testClientPool = async () => {
  const connection = await mongo.MongoClient.connect(testMongoUrl());
  return {
    connect: async () => connection,
    dispose: () => connection.close(true) // force close
  } as MongoClientPool;
};
