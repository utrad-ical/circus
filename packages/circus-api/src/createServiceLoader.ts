import configureCsCoreServiceLoader, {
  Services as CsCoreServices
} from '@utrad-ical/circus-cs-core/src/configureServiceLoader';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import path from 'path';
import connectDb, { DisposableDb } from './db/connectDb';
import createLogger from './createLogger';
import createValidator, { Validator } from './createValidator';
import createModels, { Models } from './db/createModels';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import Storage from './storage/Storage';
import createDicomImporter, { DicomImporter } from './createDicomImporter';
import createCircusRs, {
  CircusRs,
  createVolumeProvider,
  createRsRoutes
} from './createCircusRs';
import createApp from './createApp';
import Koa from 'koa';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import createDicomTagReader, {
  DicomTagReader
} from './utils/createDicomTagReader';

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
};

export type ApiServiceLoader = ServiceLoader<Services>;

const createServiceLoader = async (config: any) => {
  const loader = new ServiceLoader<Services>(config);
  // Register modules related to CS Core
  configureCsCoreServiceLoader(loader);
  // Register our modules
  loader.register('app', createApp);
  loader.register('db', connectDb);
  loader.register('apiLogger', createLogger);
  loader.register('validator', createValidator);
  loader.register('models', createModels);
  loader.register('dicomImporter', createDicomImporter);
  loader.register('rs', createCircusRs);
  loader.register('volumeProvider', createVolumeProvider);
  loader.register('rsRoutes', createRsRoutes);
  loader.register('dicomTagReader', createDicomTagReader);

  loader.registerDirectory(
    'blobStorage',
    path.join(__dirname, 'storage'),
    'MemoryStorage'
  );
  return loader as ApiServiceLoader;
};

export default createServiceLoader;
