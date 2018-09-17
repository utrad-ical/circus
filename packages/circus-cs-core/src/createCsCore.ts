import mongo from 'mongodb';
import { Item, QueueSystem, createMongoQueue } from './queue/queue';
import { PluginDefinition, PluginJobRequest } from './interface';
import createDaemonController, {
  DaemonController
} from './daemon/createDaemonController';
import { Configuration } from './config';
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
import DependentModuleLoader from './DependentModuleLoader';
import loadModule from './loadModule';
import Logger from './logger/Logger';

/**
 * cs-core facade.
 * This is returned by createCsCore().
 */
export interface CsCore {
  // Daemon controller
  daemon: {
    start(): Promise<void>;
    stop(): Promise<void>;
    status(): Promise<'running' | 'stopped'>;
    pm2list(): Promise<void>;
    pm2killall(): Promise<void>;
  };

  // plugin handler
  plugin: {
    update: (pluginDefinitions: PluginDefinition[]) => Promise<void>;
    list: () => Promise<PluginDefinition[]>;
  };

  // job handler
  job: {
    list: (
      state?: 'wait' | 'processing' | 'all'
    ) => Promise<Item<PluginJobRequest>[]>;
    register: (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) => Promise<void>;
  };

  // dispose
  dispose(): Promise<void>;
}

type Dispose = () => Promise<void>;

export default function createCsCore(config: Configuration): CsCore {
  const loader = createModuleLoader(config);

  const daemon: CsCore['daemon'] = {
    start: async () => (await loader.load('daemonController')).start(),
    stop: async () => (await loader.load('daemonController')).stop(),
    status: async () => (await loader.load('daemonController')).status(),
    pm2list: async () => (await loader.load('daemonController')).pm2list(),
    pm2killall: async () => (await loader.load('daemonController')).pm2killall()
  };

  const plugin: CsCore['plugin'] = {
    update: async pluginDefinitions =>
      (await loader.load('pluginDefinitionsAccessor')).save(pluginDefinitions),
    list: async () => (await loader.load('pluginDefinitionsAccessor')).load()
  };

  const job: CsCore['job'] = {
    register: async (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) =>
      (await loader.load('pluginJobRegisterer')).register(
        jobId,
        payload,
        priority
      ),
    list: async () => (await loader.load('queueSystem')).list()
  };

  const dispose: CsCore['dispose'] = async () => {
    const fn = await loader.load('dispose');
    fn();
  };

  return { daemon, plugin, job, dispose };
}

interface CsModules {
  logger: Logger;
  dispose: Dispose;
  daemonController: DaemonController;
  pluginDefinitionsAccessor: PluginDefinitionAccessor;
  queueSystem: QueueSystem<PluginJobRequest>;
  dicomFileRepository: DicomFileRepository;
  pluginJobRegisterer: PluginJobRegisterer;
  jobReporter: PluginJobReporter;
  jobRunner: PluginJobRunner;
}

export type CsModuleLoader = DependentModuleLoader<CsModules>;

export function createModuleLoader(config: Configuration): CsModuleLoader {
  const depLoader: CsModuleLoader = new DependentModuleLoader();

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
