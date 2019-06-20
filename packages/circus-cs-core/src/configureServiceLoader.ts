import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ServiceLoader from '@utrad-ical/circus-lib/lib/ServiceLoader';
import path from 'path';
import { Configuration } from './config/Configuration';
import createDaemonController, {
  DaemonController
} from './daemon/createDaemonController';
import { PluginJobRequest } from './interface';
import PluginJobReporter from './job/reporter/PluginJobReporter';
import PluginJobRegisterer from './job/registerer/PluginJobRegisterer';
import { PluginJobRunner } from './job/pluginJobRunner';
import { MongoClientPool } from './mongoClientPool';
import Queue from './queue/Queue';
import PluginDefinitionAccessor from './plugin-definition-accessor/PluginDefinitionAccessor';
import { CsCore } from './createCsCore';

/**
 * The list of all dependencies that can be created via ServiceLoader.
 */
export interface Services {
  logger: Logger;
  mongoClientPool: MongoClientPool;
  daemonController: DaemonController;
  queue: Queue<PluginJobRequest>;
  dicomFileRepository: DicomFileRepository;
  pluginJobRegisterer: PluginJobRegisterer;
  jobReporter: PluginJobReporter;
  jobRunner: PluginJobRunner;
  pluginDefinitionAccessor: PluginDefinitionAccessor;
  core: CsCore;
}

type Dispose = () => Promise<void>;

// Keep this module as clean and simple as possible.
// Do not try to include any business logic here!

export default function configureServiceLoader(
  config: Configuration
): ServiceLoader<Services> {
  const serviceLoader = new ServiceLoader<Services>(config as any);
  serviceLoader.registerDirectory(
    'logger',
    '@utrad-ical/circus-lib/lib/logger',
    'Log4JsLogger'
  );
  serviceLoader.registerFactory('daemonController', async config => {
    // will register as factory
    // because this needs to access the whole config content
    return createDaemonController(config as any);
  });
  serviceLoader.registerModule(
    'mongoClientPool',
    path.join(__dirname, 'createMongoClientPool')
  );
  serviceLoader.registerDirectory(
    'pluginDefinitionAccessor',
    path.join(__dirname, 'plugin-definition-accessor'),
    'StaticPluginDefinitionAccessor'
  );
  serviceLoader.registerDirectory('queue', './queue', 'MongoQueue');
  serviceLoader.registerDirectory(
    'dicomFileRepository',
    '@utrad-ical/circus-lib/lib/dicom-file-repository',
    'StaticDicomFileRepository'
  );
  serviceLoader.registerDirectory(
    'pluginJobRegisterer',
    path.join(__dirname, 'job', 'createPluginJobRegisterer'),
    'MongoPluginJobRegisterer'
  );
  serviceLoader.registerDirectory(
    'jobReporter',
    path.join(__dirname, 'job', 'reporter'),
    'MongoPluginJobReporter'
  );
  serviceLoader.registerModule(
    'jobRunner',
    path.join(__dirname, 'job', 'pluginJobRunner')
  );
  serviceLoader.registerModule('core', path.join(__dirname, 'createCsCore'));
  return serviceLoader;
}
