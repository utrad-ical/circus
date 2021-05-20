import path from 'path';
import fs from 'fs-extra';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository, FunctionService } from '@utrad-ical/circus-lib';
import pluginResultsValidator from './pluginResultsValidator';
import { MultiRange } from 'multi-integer-range';
import tarfs from 'tar-fs';
import stream from 'stream';
import * as circus from '../interface';
import buildDicomVolumes from './buildDicomVolumes';

export interface PluginJobRunner {
  run: (
    jobId: string,
    job: circus.PluginJobRequest,
    logStream?: stream.Writable
  ) => Promise<boolean>;
}

type WorkDirType = 'in' | 'out' | 'dicom';

const pluginJobRunner: FunctionService<
  PluginJobRunner,
  {
    jobReporter: circus.PluginJobReporter;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    dockerRunner: DockerRunner;
    dicomVoxelDumper: circus.DicomVoxelDumper;
  }
> = async (
  options: {
    workingDirectory: string;
    removeTemporaryDirectory?: boolean;
  },
  deps
) => {
  const { workingDirectory, removeTemporaryDirectory } = options;
  const {
    pluginDefinitionAccessor,
    jobReporter,
    dockerRunner,
    dicomVoxelDumper
  } = deps;

  if (!workingDirectory) throw new Error('Working directory is not set');

  const baseDir = (jobId: string) => {
    if (typeof jobId !== 'string' || !jobId.length) throw new Error();
    return path.join(workingDirectory, jobId);
  };

  const workDir = (jobId: string, type: WorkDirType) => {
    return path.join(baseDir(jobId), type);
  };

  const preProcess = async (
    jobId: string,
    series: circus.JobSeries[],
    logStream: stream.Writable
  ) => {
    // Prepare working directories
    logStream.write('  Preparing working directories...\n');
    await fs.ensureDir(baseDir(jobId));
    await Promise.all([
      fs.ensureDir(workDir(jobId, 'in')),
      fs.ensureDir(workDir(jobId, 'out')),
      fs.ensureDir(workDir(jobId, 'dicom'))
    ]);
    // Fetches DICOM data from DicomFileRepository and builds raw volume
    const inDir = workDir(jobId, 'in');
    await buildDicomVolumes(dicomVoxelDumper, series, inDir, logStream);
  };

  const postProcess = async (jobId: string, logStream: stream.Writable) => {
    const outDir = workDir(jobId, 'out');

    // Perform validation
    logStream.write('  Validating the results...\n');
    const results = await pluginResultsValidator(outDir);
    await jobReporter.report(jobId, 'results', results);

    // Send the contents of outDir via PluginJobReporter
    logStream.write('  Copying the result files...\n');
    const stream = tarfs.pack(outDir);
    await jobReporter.packDir(jobId, stream);

    // And removes the job temp directory altogether
    if (removeTemporaryDirectory) await fs.remove(baseDir(jobId));
  };

  /**
   * The whole plugin job procedure.
   */
  const run = async (
    jobId: string,
    job: circus.PluginJobRequest,
    logStream: stream.Writable = process.stdout
  ) => {
    const writeLog = (log: string) => {
      const timeStamp = '[' + new Date().toISOString() + ']';
      logStream.write(timeStamp + ' ' + log);
    };

    try {
      const { pluginId, series, environment } = job;

      const plugin = await pluginDefinitionAccessor.get(pluginId);
      if (!plugin) throw new Error(`No such plugin: ${pluginId}`);

      await jobReporter.report(jobId, 'processing');

      writeLog('Starting pre-process...\n');
      await preProcess(jobId, series, logStream);

      // mainProcess
      writeLog('Executing the plug-in...\n\n');
      const { stream, promise } = await executePlugin(
        dockerRunner,
        plugin,
        workDir(jobId, 'in'), // Plugin input dir containing volume data
        workDir(jobId, 'out') // Plugin output dir that will have CAD results
      );
      stream.pipe(
        logStream,
        { end: false } // Keeps the logStream open
      );
      await promise;

      writeLog('Starting post-process...\n\n');
      await postProcess(jobId, logStream);
      await jobReporter.report(jobId, 'finished');
      writeLog('Plug-in execution done.\n\n');
      return true;
    } catch (e) {
      writeLog('Error happened in plug-in job runner:\n' + e.stack + '\n');
      await jobReporter.report(jobId, 'failed', e.message);
      return false;
    }
  };

  return { run };
};

pluginJobRunner.dependencies = [
  'jobReporter',
  'pluginDefinitionAccessor',
  'dockerRunner',
  'dicomVoxelDumper'
];
export default pluginJobRunner;

/**
 * Executes the specified plugin.
 * @param dockerRunner Docker runner instance.
 * @param pluginDefinition Plugin definition.
 * @param srcDir Plugin input directory containing volumes.
 * @param destDir Plugin output directory that will contain CAD results.
 */
export async function executePlugin(
  dockerRunner: DockerRunner,
  pluginDefinition: circus.PluginDefinition,
  srcDir: string,
  destDir: string
): Promise<{ stream: NodeJS.ReadableStream; promise: Promise<number> }> {
  const {
    pluginId,
    maxExecutionSeconds = 3000,
    binds: { in: bindsIn = '/circus/in', out: bindsOut = '/circus/out' } = {}
  } = pluginDefinition;

  const timeoutMs = maxExecutionSeconds * 1000;
  return dockerRunner.runWithStream(
    {
      Image: pluginId,
      NetworkDisabled: true,
      HostConfig: {
        Binds: [`${srcDir}:${bindsIn}`, `${destDir}:${bindsOut}`]
      }
    },
    timeoutMs
  );
}
