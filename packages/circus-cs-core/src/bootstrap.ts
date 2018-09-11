import createDaemonController from './daemon/createDaemonController';
import config from './config';
import { QueueSystem, createMongoQueue } from './queue/queue';
import { PluginJobRequest } from './interface';
import mongo from 'mongodb';
import pluginJobRunner, { PluginJobRunner } from './job/pluginJobRunner';
import DockerRunner from './util/DockerRunner';
import pluginJobReporter from './job/pluginJobReporter';
import {
  StaticDicomFileRepository,
  DicomFileRepository
} from '@utrad-ical/circus-dicom-repository';
import pluginDefinitionsAccessor from './util/info';

export function bootstrapDaemonController() {
  const startOptions = config.jobManager.startOptions;
  const coreWorkingDir = config.coreWorkingDir;
  const controller = createDaemonController({startOptions, coreWorkingDir});
  return controller;
}

interface QueueSystemData {
  queue: QueueSystem<PluginJobRequest>;
  dispose: () => Promise<void>;
}

/**
 * Creates a MonboDB-based queue system based on the configuration.
 */
export async function bootstrapQueueSystem(): Promise<QueueSystemData> {
  const client = await mongo.MongoClient.connect(config.queue.mongoUrl);
  const collection = client.db().collection(config.queue.collectionName);
  const queue = await createMongoQueue<PluginJobRequest>({ collection });
  return {
    queue,
    dispose: () => client.close()
  };
}

export async function bootstrapDicomFileRepository(): Promise<
  DicomFileRepository
> {
  const dicomRepository = new StaticDicomFileRepository(
    config.dicomFileRepository.options
  );
  return dicomRepository;
}

/**
 * Creates a job runner based on the current configuration.
 */
export async function bootstrapJobRunner(
  dicomRepository: DicomFileRepository
): Promise<PluginJobRunner> {
  const dockerRunner = new DockerRunner(config.docker);

  const client = await mongo.MongoClient.connect(config.jobReporter.mongoUrl);
  const collection = client.db().collection(config.jobReporter.collectionName);
  const jobReporter = pluginJobReporter(collection);

  const pluginDefs = pluginDefinitionsAccessor(config.coreWorkingDir);
  pluginDefs.save(config.plugins);

  const jobRunner = pluginJobRunner({
    jobReporter,
    dockerRunner,
    dicomRepository,
    pluginDefinitionsAccessor: pluginDefs,
    workingDirectory: config.pluginWorkingDir,
    resultsDirectory: config.pluginResultsDir,
    removeTemporaryDirectory: config.cleanPluginWorkingDir
  });
  return jobRunner;
}
