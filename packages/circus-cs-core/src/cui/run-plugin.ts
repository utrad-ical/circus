import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import os from 'os';
import pluginJobRunner from '../job/pluginJobRunner';
import chalk from 'chalk';
import DockerRunner from '../util/DockerRunner';
import tarfs from 'tar-fs';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import * as circus from '../interface';
import createDicomVoxelDumper from '../job/createDicomVoxelDumper';
import createTmpDicomFileRepository, {
  createJobSeries
} from './util/tmpDicomFileRepository';

/**
 * Directly runs the specified plug-in without using a queue system.
 * The source DICOM files can be stored in a local directory (with -d option).
 * Existing content of the output directory will be erased.
 */
const runPlugin: FunctionService<
  Command,
  {
    dockerRunner: DockerRunner;
    dicomFileRepository: DicomFileRepository;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
  }
> = async (options, deps) => {
  const { dockerRunner, pluginDefinitionAccessor, dicomFileRepository } = deps;
  return async (commandName, args) => {
    const {
      _: [pluginId, ...seriesUidOrDirectories],
      d, // Use DICOM directory directly, instead of repository
      keep, // keep work directory
      work = os.tmpdir(),
      out: resultsDir
    } = args as {
      _: string[];
      d?: boolean;
      keep?: boolean;
      work?: string;
      out?: string;
    };
    if (!pluginId) {
      console.log(
        'Usage: node cui.js run-plugin <plugin-id> <series-or-directories>...'
      );
      throw new Error('Plug-in ID is not specified.');
    }
    if (!resultsDir) {
      throw new Error('The result directory must be specified.');
    }
    if (!seriesUidOrDirectories.length) {
      throw new Error('One or more series must be specified.');
    }

    const jobReporter: circus.PluginJobReporter = {
      report: async (jobId, type, payload) => {
        console.log(chalk.cyan('Job status changed:', type));
      },
      packDir: (jobId, stream) => {
        return new Promise((resolve, reject) => {
          const extract = tarfs.extract(resultsDir);
          extract.on('finish', resolve);
          extract.on('error', reject);
          stream.pipe(extract);
        });
      }
    };

    const repo: DicomFileRepository = d
      ? createTmpDicomFileRepository(seriesUidOrDirectories)
      : dicomFileRepository;

    const dicomVoxelDumper = await createDicomVoxelDumper(
      {},
      { dicomFileRepository: repo }
    );

    const series = await createJobSeries(!!d, repo, seriesUidOrDirectories);

    const jobRequest: circus.PluginJobRequest = {
      pluginId,
      series
    };

    const runner = await pluginJobRunner(
      { workingDirectory: work, removeTemporaryDirectory: !keep },
      { jobReporter, pluginDefinitionAccessor, dockerRunner, dicomVoxelDumper }
    );
    await runner.run('dummy', jobRequest, process.stdout);
  };
};

runPlugin.dependencies = [
  'dockerRunner',
  'dicomFileRepository',
  'pluginDefinitionAccessor'
];

export default runPlugin;
