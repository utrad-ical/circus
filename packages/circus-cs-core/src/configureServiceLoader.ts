import {
  DicomFileRepository,
  Logger,
  ServiceLoader
} from '@utrad-ical/circus-lib';
import path from 'path';
import createDaemonController from './daemon/createDaemonController';
import { PluginJobRegisterer } from './job/registerer/createPluginJobRegisterer';
import { PluginJobRunner } from './job/pluginJobRunner';
import { MongoClientPool } from './mongoClientPool';
import DockerRunner from './util/DockerRunner';
import * as circus from './interface';

/**
 * The list of all dependencies that can be created via ServiceLoader.
 */
export interface Services {
  logger: Logger;
  daemonController: circus.DaemonController;
  pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
  jobReporter: circus.PluginJobReporter;
  queue: circus.PluginJobRequestQueue;
  mongoClientPool: MongoClientPool;
  dicomFileRepository: DicomFileRepository;
  pluginJobRegisterer: PluginJobRegisterer;
  jobRunner: PluginJobRunner;
  dockerRunner: DockerRunner;
  core: circus.CsCore;
  configGetter: circus.Configuration;
  dicomVoxelDumper: circus.DicomVoxelDumper;
  [key: string]: any; // This allows to add services outside this file
}

// Keep this module as clean and simple as possible.
// Do not try to include any business logic here!

export default function configureServiceLoader(
  serviceLoader: ServiceLoader
): ServiceLoader<Services> {
  // const serviceLoader = new ServiceLoader<Services>(config as any);
  serviceLoader.registerDirectory(
    'csCoreDaemonLogger',
    '<circus-lib>/logger',
    'StdoutLogger'
  );
  serviceLoader.registerFactory('daemonController', async config => {
    // will register as factory
    // because this needs to access the whole config content
    return createDaemonController(config as any);
  });

  // The following three services interact with database
  serviceLoader.registerDirectory(
    'pluginDefinitionAccessor',
    path.join(__dirname, 'plugin-definition-accessor'),
    'StaticPluginDefinitionAccessor'
  );
  serviceLoader.registerDirectory(
    'jobReporter',
    path.join(__dirname, 'job', 'reporter'),
    'MongoPluginJobReporter'
  );
  serviceLoader.registerDirectory(
    'queue',
    path.join(__dirname, 'job', 'queue'),
    'MongoQueue'
  );

  // Used by mongodb-related services
  serviceLoader.registerModule(
    'mongoClientPool',
    path.join(__dirname, 'mongoClientPool')
  );

  // DICOM file repository
  serviceLoader.registerDirectory(
    'dicomFileRepository',
    '<circus-lib>/dicom-file-repository',
    'StaticDicomFileRepository'
  );

  // Misc 'singleton' modules
  serviceLoader.registerModule(
    'pluginJobRegisterer',
    path.join(__dirname, 'job', 'registerer', 'createPluginJobRegisterer')
  );
  serviceLoader.registerModule(
    'jobRunner',
    path.join(__dirname, 'job', 'pluginJobRunner')
  );
  serviceLoader.registerModule(
    'dockerRunner',
    path.join(__dirname, 'util', 'DockerRunner')
  );
  serviceLoader.registerFactory('configuration', async config => config);

  // "the facade"
  serviceLoader.registerModule('core', path.join(__dirname, 'createCsCore'));

  serviceLoader.registerModule(
    'dicomVoxelDumper',
    path.join(__dirname, 'job', 'createDicomVoxelDumper')
  );

  return serviceLoader;
}
