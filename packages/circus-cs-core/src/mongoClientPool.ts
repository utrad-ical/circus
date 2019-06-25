import { FunctionService } from '@utrad-ical/circus-lib';
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
    dispose: async () => {
      for (const k of pool.keys()) {
        await pool.get(k)!.close();
      }
    }
  };
};

export default createMongoClientPool;
