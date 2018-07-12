import createDaemonController from './functions/createDaemonController';
import config from './config';
import { QueueSystem, craeteMongoQueue } from './queue/queue';
import { PluginJobRequest } from './interface';
import * as mongo from 'mongodb';
import pluginJobRunner, { PluginJobRunner } from './job/pluginJobRunner';
import DockerRunner from './util/DockerRunner';
import pluginJobReporter from './job/pluginJobReporter';
import {
  StaticDicomFileRepository,
  DicomFileRepository
} from '@utrad-ical/circus-dicom-repository';

export function bootstrapDaemonController() {
  const startOptions = config.jobManager.startOptions;
  const controller = createDaemonController(startOptions);
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
  const queue = await craeteMongoQueue<PluginJobRequest>({ collection });
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
  const jobRunner = pluginJobRunner({
    jobReporter,
    dockerRunner,
    dicomRepository,
    pluginList: config.plugins,
    workingDirectory: config.pluginWorkingDir,
    resultsDirectory: config.pluginResultsDir,
    removeTemporaryDirectory: config.cleanPluginWorkingDir
  });
  return jobRunner;
}
