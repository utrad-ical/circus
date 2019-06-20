import PluginJobReporter from './PluginJobReporter';
import { FunctionService } from '@utrad-ical/circus-lib';
import { MongoClientPool } from '../../mongoClientPool';

/**
 * An implementation of PluginJobReporter that writes plugin status on
 * CIRCUS CS API server.
 */
const createMongoPluginJobReporter: FunctionService<
  PluginJobReporter,
  { mongoClientPool: MongoClientPool }
> = async (options: any, { mongoClientPool }) => {
  const client = await mongoClientPool.connect(options.mongoUrl);
  const collection = await client.db().collection(options.collectionName);

  const report = async (jobId: string, type: string, payload?: any) => {
    if (!jobId) throw new Error('Job ID undefined');

    switch (type) {
      case 'processing':
        await collection.findOneAndUpdate(
          { jobId },
          {
            $set: {
              status: 'processing',
              startedAt: new Date()
            }
          }
        );
        break;
      case 'finished':
        await collection.findOneAndUpdate(
          { jobId },
          {
            $set: {
              status: 'finished',
              finishedAt: new Date()
            }
          }
        );
        break;
      case 'results':
        await collection.findOneAndUpdate(
          { jobId },
          {
            $set: {
              results: payload
            }
          }
        );
        break;
      case 'failed':
        await collection.findOneAndUpdate(
          { jobId },
          {
            $set: {
              status: 'failed',
              errorMessage: payload
            }
          }
        );
        break;
    }
  };
  return { report };
};

createMongoPluginJobReporter.dependencies = ['mongoClientPool'];
export default createMongoPluginJobReporter;
