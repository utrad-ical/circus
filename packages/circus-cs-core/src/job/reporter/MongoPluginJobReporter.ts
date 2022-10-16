import { FunctionService } from '@utrad-ical/circus-lib';
import { MongoClientPool } from '../../mongoClientPool';
import tarfs from 'tar-fs';
import fs from 'fs-extra';
import path from 'path';
import * as circus from '../../interface';
import { Readable } from 'stream';

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

  const logStream = async (
    jobId: string,
    stream: Readable,
    callback?: () => void
  ) => {
    const outFile = path.join(resultsDirectory, jobId, 'plugin-log.txt');
    await fs.ensureDir(path.dirname(outFile));
    const fileStream = fs.createWriteStream(outFile, 'utf8');
    stream.pipe(fileStream);
    if (callback) {
      fileStream.on('finish', () => callback());
      fileStream.on('error', callback);
    }
  };

  const packDir = (jobId: string, stream: Readable) => {
    return new Promise<void>((resolve, reject) => {
      const outDir = path.join(resultsDirectory, jobId);
      const extract = tarfs.extract(outDir, {
        dmode: 0o555, // all dirs should be readable
        fmode: 0o444 // all files should be readable
      });
      stream.pipe(extract);
      extract.on('finish', resolve);
      extract.on('error', reject);
    });
  };

  return { report, logStream, packDir };
};

createMongoPluginJobReporter.dependencies = ['mongoClientPool'];
export default createMongoPluginJobReporter;
