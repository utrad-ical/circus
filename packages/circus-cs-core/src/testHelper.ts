import * as mongo from 'mongodb';
import type { MongoClientPool } from './mongoClientPool.ts';

/**
 * Returns the MongoDB connection string for cs-core tests.
 * `CIRCUS_MONGO_TEST_URL` is shared with circus-api tests,
 * so only the server part is taken from it and a separate database is used.
 * Otherwise, the two test suites overwrite the same collections
 * (e.g., `pluginDefinitions`) of each other.
 * Without `authSource`, MongoDB authenticates against the database in the
 * path, so the original one is kept as `authSource`.
 */
export const testMongoUrl = (
  baseUrl = process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test'
) => {
  const match =
    /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/.exec(baseUrl);
  if (!match) throw new Error('Invalid MongoDB connection string');
  const [, server, dbName = '', query = ''] = match;
  const params = query ? query.split('&') : [];
  if (!params.some(p => /^authSource=/i.test(p))) {
    const authSource = decodeURIComponent(dbName) || 'admin';
    params.push('authSource=' + encodeURIComponent(authSource));
  }
  return `${server}/cs-core-test?${params.join('&')}`;
};

export const testClientPool = async () => {
  const connection = await mongo.MongoClient.connect(testMongoUrl());
  return {
    connect: async () => connection,
    dispose: () => connection.close(true) // force close
  } as MongoClientPool;
};
