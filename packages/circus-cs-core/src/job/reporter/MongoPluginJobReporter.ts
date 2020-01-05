import { FunctionService } from '@utrad-ical/circus-lib';
import { MongoClientPool } from '../../mongoClientPool';
import tarfs from 'tar-fs';
import path from 'path';
import * as circus from '../../interface';

/**
 * An implementation of PluginJobReporter that writes plugin status on
 * CIRCUS CS API server.
 */
const createMongoPluginJobReporter: FunctionService<
  circus.PluginJobReporter,
  { mongoClientPool: MongoClientPool }
> = async (options: any, { mongoClientPool }) => {
  const client = await mongoClientPool.connect(options.mongoUrl);
  const collection = await client.db().collection(options.collectionName);
  const { resultsDirectory } = options;

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

  const packDir = (jobId: string, stream: NodeJS.ReadableStream) => {
    return new Promise(resolve => {
      const outDir = path.join(resultsDirectory, jobId);
      const extract = tarfs.extract(outDir, {
        dmode: 0o555, // all dirs should be readable
        fmode: 0o444 // all files should be readable
      });
      stream.pipe(extract);
      extract.on('finish', resolve);
    }) as Promise<void>;
  };

  return { report, packDir };
};

createMongoPluginJobReporter.dependencies = ['mongoClientPool'];
export default createMongoPluginJobReporter;
