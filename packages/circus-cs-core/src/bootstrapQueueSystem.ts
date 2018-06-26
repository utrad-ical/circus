import { QueueSystem, craeteMongoQueue } from './queue/queue';
import config from './config';
import { PluginJobRequest } from './interface';

/**
 * Creates a MonboDB-based queue system based on the configuration.
 */
export async function bootstrapQueueSystem(): Promise<
  QueueSystem<PluginJobRequest>
> {
  const options = {
    mongoUrl: config.queue.mongoURL,
    collectionName: config.queue.collectionTitle
  };
  const result = await craeteMongoQueue<PluginJobRequest>(options);
  return result;
}
