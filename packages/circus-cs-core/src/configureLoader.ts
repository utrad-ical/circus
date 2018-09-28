import mongo from 'mongodb';
import { createMongoQueue, QueueSystem } from './queue/queue';
import { PluginJobRequest } from './interface';
import createDaemonController, {
  DaemonController
} from './daemon/createDaemonController';
import { Configuration } from './config/Configuration';
import pluginJobRunner, { PluginJobRunner } from './job/pluginJobRunner';
import pluginDefinitionsAccessor, {
  PluginDefinitionAccessor
} from './util/pluginDefinitionsAccessor';
import createPluginJobRegisterer, {
  PluginJobRegisterer
} from './job/createPluginJobRegisterer';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import pluginJobReporter, { PluginJobReporter } from './job/pluginJobReporter';
import DockerRunner from './util/DockerRunner';
import DependentModuleLoader from './circus-lib/DependentModuleLoader';
import loadModule from './loadModule';
import Logger from './logger/Logger';

export interface CsModules {
  logger: Logger;
  dispose: () => Promise<void>;
  daemonController: DaemonController;
  pluginDefinitionsAccessor: PluginDefinitionAccessor;
  queueSystem: QueueSystem<PluginJobRequest>;
  dicomFileRepository: DicomFileRepository;
  pluginJobRegisterer: PluginJobRegisterer;
  jobReporter: PluginJobReporter;
  jobRunner: PluginJobRunner;
}

type Dispose = () => Promise<void>;

export default function configureLoader(
  config: Configuration
): DependentModuleLoader<CsModules> {
  const depLoader: DependentModuleLoader<
    CsModules
  > = new DependentModuleLoader();
  const disposeCollection: Dispose[] = [];
  depLoader.registerLoader(
    'dispose',
    async () => {
      return async () => {
        await Promise.all(disposeCollection.map(i => i()));
      };
    },
    []
  );
  depLoader.registerLoader(
    'logger',
    async () => {
      return await loadModule<Logger>('logger', './logger', config.logger);
    },
    []
  );
  depLoader.registerLoader(
    'daemonController',
    async () => createDaemonController(config),
    []
  );
  depLoader.registerLoader(
    'pluginDefinitionsAccessor',
    async () => pluginDefinitionsAccessor(config.coreWorkingDir),
    []
  );
  /**
   * Creates a MonboDB-based queue system based on the configuration.
   */
  depLoader.registerLoader(
    'queueSystem',
    async deps => {
      const { mongoUrl, collectionName } = config.queue;
      const client = await mongo.MongoClient.connect(mongoUrl);
      const collection = client.db().collection(collectionName);
      const queue = await createMongoQueue<PluginJobRequest>({ collection });
      disposeCollection.push(() => client.close());
      return queue;
    },
    []
  );
  depLoader.registerLoader(
    'dicomFileRepository',
    async deps => {
      return await loadModule<DicomFileRepository>(
        'dicom file repository',
        '@utrad-ical/circus-dicom-repository/lib',
        config.dicomFileRepository
      );
    },
    []
  );
  depLoader.registerLoader(
    'pluginJobRegisterer',
    async deps => {
      return createPluginJobRegisterer({
        queue: deps.queueSystem,
        repository: deps.dicomFileRepository,
        pluginDefinitionLoader: deps.pluginDefinitionsAccessor.get
      });
    },
    ['queueSystem', 'dicomFileRepository', 'pluginDefinitionsAccessor']
  );
  depLoader.registerLoader(
    'jobReporter',
    async deps => {
      const { mongoUrl, collectionName } = config.jobReporter;
      const client = await mongo.MongoClient.connect(mongoUrl);
      const collection = client.db().collection(collectionName);
      const jobReporter = pluginJobReporter(collection);
      disposeCollection.push(() => client.close());
      return jobReporter;
    },
    []
  );
  depLoader.registerLoader(
    'jobRunner',
    async deps => {
      return pluginJobRunner({
        jobReporter: deps.jobReporter,
        dockerRunner: new DockerRunner(config.docker),
        dicomRepository: deps.dicomFileRepository,
        pluginDefinitionLoader: deps.pluginDefinitionsAccessor.get,
        workingDirectory: config.pluginWorkingDir,
        resultsDirectory: config.pluginResultsDir,
        removeTemporaryDirectory: config.cleanPluginWorkingDir
      });
    },
    ['jobReporter', 'dicomFileRepository', 'pluginDefinitionsAccessor']
  );
  return depLoader;
}
