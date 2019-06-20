import { FunctionService } from '@utrad-ical/circus-lib/lib/ServiceLoader';
import mongo from 'mongodb';

export type MongoClientPool = {
  connect: (url: string) => Promise<mongo.MongoClient>;
  dispose: () => Promise<void>;
};

const createMongoClientPool: FunctionService<MongoClientPool> = async () => {
  const pool = new Map<string, mongo.MongoClient>();
  return {
    connect: async (url: string) => {
      if (pool.has(url)) return pool.get(url)!;
      const client = await mongo.MongoClient.connect(url);
      pool.set(url, client);
      return client;
    },
    dispose: async () => {}
  };
};

export default createMongoClientPool;
