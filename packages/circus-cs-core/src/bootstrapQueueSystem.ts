import { QueueSystem, craeteMongoQueue } from './queue/queue';
import config from './config';
import { PluginJobRequest } from './interface';
import * as mongo from 'mongodb';

interface QueueSystemData {
  queue: QueueSystem<PluginJobRequest>;
  dispose: () => Promise<void>;
}

/**
 * Creates a MonboDB-based queue system based on the configuration.
 */
export default async function bootstrapQueueSystem(): Promise<QueueSystemData> {
  const client = await mongo.MongoClient.connect(config.queue.mongoURL);
  const collection = client.db().collection(config.queue.collectionTitle);
  const queue = await craeteMongoQueue<PluginJobRequest>({ collection });
  return {
    queue,
    dispose: () => client.close()
  };
}
