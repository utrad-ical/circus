import type { CsCoreServices } from '@utrad-ical/circus-cs-core';
import { configureCsCoreServiceLoader } from '@utrad-ical/circus-cs-core';
import type { RsServices } from '@utrad-ical/circus-rs/server';
import { configureRsServiceLoader } from '@utrad-ical/circus-rs/server';
import type { Logger } from '@utrad-ical/circus-lib';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import path from 'path';
import type {
  Database,
  Validator,
  DicomImporter,
  DicomTagReader,
  Models,
  AuthProvider,
  TransactionManager
} from './interface.ts';
import type Storage from './storage/Storage.ts';
import type Koa from 'koa';
import type { DicomUtilityRunner } from './utils/createDicomUtilityRunner.ts';
import createDicomUtilityRunner from './utils/createDicomUtilityRunner.ts';
import type { TaskManager } from './createTaskManager.ts';
import type { MhdPacker } from './case/createMhdPacker.ts';
import type KoaOAuth2Server from './middleware/auth/KoaOAuth2Server.ts';
import type { SeriesOrientationResolver } from './utils/createSeriesOrientationResolver.ts';

export type Services = CsCoreServices &
  RsServices & {
    app: Koa;
    database: Database;
    apiLogger: Logger;
    validator: Validator;
    models: Models;
    dicomImporter: DicomImporter;
    blobStorage: Storage;
    dicomTagReader: DicomTagReader;
    dicomUtilityRunner: DicomUtilityRunner;
    taskManager: TaskManager;
    mhdPacker: MhdPacker;
    oauthServer: KoaOAuth2Server;
    authProvider: AuthProvider;
    defaultAuthProvider: AuthProvider;
    transactionManager: TransactionManager;
    seriesOrientationResolver: SeriesOrientationResolver;
  };

export type ApiServiceLoader = ServiceLoader<Services>;

const createServiceLoader = async (config: any) => {
  const loader = new ServiceLoader<Services>(config);
  // Register modules related to CS Core
  configureCsCoreServiceLoader(loader as any);
  configureRsServiceLoader(loader);
  // Register our modules
  loader.registerModule('apiServer', path.join(__dirname, 'createApp'));
  loader.registerModule('database', path.join(__dirname, 'db/connectDb'));
  loader.registerDirectory('apiLogger', '<circus-lib>/logger', 'NullLogger');
  loader.registerModule('validator', path.join(__dirname, 'createValidator'));
  loader.registerModule('models', path.join(__dirname, 'db/createModels'));
  loader.registerModule(
    'dicomImporter',
    path.join(__dirname, 'createDicomImporter')
  );
  loader.registerModule('rs', path.join(__dirname, 'createCircusRs'));
  loader.registerModule(
    'dicomTagReader',
    path.join(__dirname, 'utils/createDicomTagReader')
  );
  loader.register('dicomUtilityRunner', createDicomUtilityRunner);

  loader.registerDirectory(
    'blobStorage',
    path.join(__dirname, 'storage'),
    'MemoryStorage'
  );
  loader.registerModule(
    'taskManager',
    path.join(__dirname, 'createTaskManager')
  );
  loader.registerModule(
    'mhdPacker',
    path.join(__dirname, 'case/createMhdPacker')
  );
  loader.registerModule(
    'oauthServer',
    path.join(__dirname, 'middleware/auth/createOauthServer')
  );
  loader.registerDirectory(
    'authProvider',
    path.join(__dirname, 'middleware/auth/authProvider'),
    'DefaultAuthProvider'
  );
  loader.registerModule(
    'defaultAuthProvider',
    path.join(__dirname, 'middleware/auth/authProvider/DefaultAuthProvider')
  );
  loader.registerModule(
    'transactionManager',
    path.join(__dirname, 'createTransactionManager')
  );
  loader.registerModule(
    'seriesOrientationResolver',
    path.join(__dirname, 'utils/createSeriesOrientationResolver')
  );
  return loader as ApiServiceLoader;
};

export default createServiceLoader;
