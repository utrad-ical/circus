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
import createCircusRs, { CircusRs } from './createCircusRs';

export type Services = CsCoreServices & {
  db: DisposableDb;
  apiLogger: Logger;
  validator: Validator;
  models: Models;
  dicomImporter: DicomImporter;
  rs: CircusRs;
  blobStorage: Storage;
};

export type ApiServiceLoader = ServiceLoader<Services>;

const createServiceLoader = async (config: any) => {
  const loader = new ServiceLoader<Services>(config);
  // Register modules related to CS Core
  configureCsCoreServiceLoader(loader);
  // Register our modules
  loader.register('db', connectDb);
  loader.register('apiLogger', createLogger);
  loader.register('validator', createValidator);
  loader.register('models', createModels);
  loader.register('dicomImporter', createDicomImporter);
  loader.register('rs', createCircusRs);
  loader.registerDirectory(
    'blobStorage',
    path.join(__dirname, 'storage'),
    'MemoryStorage'
  );
  return loader as ApiServiceLoader;
};

export default createServiceLoader;
