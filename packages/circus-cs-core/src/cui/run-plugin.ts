import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import os from 'os';
import pluginJobRunner from '../job/pluginJobRunner';
import chalk from 'chalk';
import DockerRunner from '../util/DockerRunner';
import tarfs from 'tar-fs';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import StaticDicomFileRepository from '@utrad-ical/circus-lib/src/dicom-file-repository/StaticDicomFileRepository';
import * as circus from '../interface';
import { multirange } from 'multi-integer-range';

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
    dicomVoxelDumper: circus.DicomVoxelDumper;
  }
> = async (options, deps) => {
  const {
    dockerRunner,
    pluginDefinitionAccessor,
    dicomFileRepository,
    dicomVoxelDumper
  } = deps;
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
          stream.pipe(extract);
        });
      }
    };

    let dicomRepository: DicomFileRepository = dicomFileRepository;
    if (d) {
      // Create a temporary DicomFileRepository
      dicomRepository = new StaticDicomFileRepository({
        dataDir: seriesUidOrDirectories[0],
        customUidDirMap: (indexAsSeriesUid: string) => {
          const index = parseInt(indexAsSeriesUid);
          return seriesUidOrDirectories[index];
        }
      });
    }

    const series: circus.JobSeries[] = [];
    for (let i = 0; i < seriesUidOrDirectories.length; i++) {
      const item = seriesUidOrDirectories[i];
      const seriesUid = d ? String(i) : item; // Use index as UID when directory mode
      const seriesAccessor = await dicomRepository.getSeries(seriesUid);
      const images = multirange(seriesAccessor.images);
      const [start, end] = images.getRanges()[0];
      series.push({
        seriesUid,
        partialVolumeDescriptor: { start, end, delta: 1 }
      });
    }

    const pjrDeps = {
      jobReporter,
      dicomRepository,
      pluginDefinitionAccessor,
      dockerRunner,
      dicomVoxelDumper
    };

    const jobRequest: circus.PluginJobRequest = {
      pluginId,
      series
    };

    const runner = await pluginJobRunner(
      { workingDirectory: work, removeTemporaryDirectory: !keep },
      pjrDeps
    );
    runner.run('dummy', jobRequest, process.stdout);
  };
};

runPlugin.dependencies = [
  'dockerRunner',
  'dicomFileRepository',
  'pluginDefinitionAccessor',
  'dicomVoxelDumper'
];

export default runPlugin;
