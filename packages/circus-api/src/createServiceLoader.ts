import configureCsCoreServiceLoader, {
  Services as CsCoreServices
} from '@utrad-ical/circus-cs-core/src/configureServiceLoader';
import ServiceLoader from '@utrad-ical/circus-lib/lib/ServiceLoader';
import path from 'path';
import {
  DisposableDb,
  Validator,
  DicomImporter,
  CircusRs,
  DicomTagReader,
  Models
} from './interface';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import Storage from './storage/Storage';
import { createVolumeProvider, createRsRoutes } from './createCircusRs';
import Koa from 'koa';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import createDicomUtilityRunner, {
  DicomUtilityRunner
} from './utils/createDicomUtilityRunner';

export type Services = CsCoreServices & {
  app: Koa;
  db: DisposableDb;
  apiLogger: Logger;
  validator: Validator;
  models: Models;
  dicomImporter: DicomImporter;
  rs: CircusRs;
  rsRoutes: Koa.Middleware;
  volumeProvider: VolumeProvider;
  blobStorage: Storage;
  dicomTagReader: DicomTagReader;
  dicomUtilityRunner: DicomUtilityRunner;
};

export type ApiServiceLoader = ServiceLoader<Services>;

const createServiceLoader = async (config: any) => {
  const loader = new ServiceLoader<Services>(config);
  // Register modules related to CS Core
  configureCsCoreServiceLoader(loader);
  // Register our modules
  loader.registerModule('app', path.join(__dirname, '/createApp'));
  loader.registerModule('db', path.join(__dirname, './db/connectDb'));
  loader.registerDirectory(
    'apiLogger',
    '@utrad-ical/circus-lib/lib/logger',
    'NullLogger'
  );
  loader.registerModule('validator', path.join(__dirname, '/createValidator'));
  loader.registerModule('models', path.join(__dirname, './db/createModels'));
  loader.registerModule(
    'dicomImporter',
    path.join(__dirname, './createDicomImporter')
  );
  loader.registerModule('rs', path.join(__dirname, './createCircusRs'));
  loader.register('volumeProvider', createVolumeProvider);
  loader.register('rsRoutes', createRsRoutes);
  loader.registerModule(
    'dicomTagReader',
    path.join(__dirname, './utils/createDicomTagReader')
  );
  loader.register('dicomUtilityRunner', createDicomUtilityRunner);

  loader.registerDirectory(
    'blobStorage',
    path.join(__dirname, 'storage'),
    'MemoryStorage'
  );
  return loader as ApiServiceLoader;
};

export default createServiceLoader;
