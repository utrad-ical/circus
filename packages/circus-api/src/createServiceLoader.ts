import configureCsCoreServiceLoader, {
  Services as CsCoreServices
} from '@utrad-ical/circus-cs-core/src/configureServiceLoader';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import os from 'os';
import csCoreConfigDefaults from '@utrad-ical/circus-cs-core/src/config/default';
import mongo from 'mongodb';
import path from 'path';
import connectDb from './db/connectDb';
import createLogger from './createLogger';
import createValidator from './createValidator';
import createModels from './db/createModels';

interface Db {
  db: mongo.Db;
  dbConnection: mongo.MongoClient;
}

export type Services = CsCoreServices & {
  apiDb: Db;
};

export type ApiServiceLoader = ServiceLoader<Services>;

const createServiceLoader = async (options: any) => {
  const mongoUrl = process.env.CIRCUS_MONGO_URL || process.env.MONGO_URL;
  const configObj = {
    db: {
      options: { mongoUrl }
    },
    apiLogger: {
      options: { logDir: path.resolve(__dirname, '../store/logs') }
    },
    jobRunner: {
      options: {
        workingDirectory: path.join(os.tmpdir(), 'circus-cs'),
        removeTemporaryDirectory: false
      }
    },
    pluginDefinitionAccessor: {
      type: 'MongoPluginDefinitionAccessor',
      options: { mongoUrl, collectionName: 'pluginDefinitions' }
    },
    queue: {
      type: 'MongoQueue',
      options: { mongoUrl, collectionName: 'pluginJobQueue' }
    },
    jobManager: csCoreConfigDefaults.jobManager,
    jobReporter: {
      type: 'MongoPluginJobReporter',
      options: {
        mongoUrl,
        collectionName: 'pluginJobs',
        pluginResultsDir: options.pluginResultsPath
      }
    },
    dicomFileRepository: {
      module: 'StaticDicomFileRepository',
      options: { dataDir: options.dicomPath, useHash: false }
    }
  };
  const loader = new ServiceLoader<Services>(configObj);
  // Register modules related to CS Core
  configureCsCoreServiceLoader(loader);
  // Register our modules
  loader.register('db', connectDb);
  loader.register('apiLogger', createLogger);
  loader.register('validator', createValidator);
  loader.register('models', createModels);
  return loader as ApiServiceLoader;
};

export default createServiceLoader;
