import { FunctionService } from '@utrad-ical/circus-lib';
import fs from 'fs-extra';
import path from 'path';
import stream, { PassThrough } from 'stream';
import tarfs from 'tar-fs';
import * as circus from '../interface';
import DockerRunner from '../util/DockerRunner';
import { extractTarToDir, readLine } from '../util/streams';
import adapters from './adapters/index';
import buildDicomVolumes from './buildDicomVolumes';
import pluginResultsValidator from './pluginResultsValidator';

export interface PluginJobRunner {
  run: (jobId: string, job: circus.PluginJobRequest) => Promise<boolean>;
}

type WorkDirType = 'in' | 'out' | 'dicom';

const waitForFile = async (
  filePath: string,
  timeoutMs = 10000,
  intervalMs = 500
) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }
  throw new Error(
    `Timeout: File ${filePath} did not appear within ${timeoutMs}ms`
  );
};

const pluginJobRunner: FunctionService<
  PluginJobRunner,
  {
    jobReporter: circus.PluginJobReporter;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    dockerRunner?: DockerRunner;
    dicomVoxelDumper: circus.DicomVoxelDumper;
  }
> = async (
  options: {
    workingDirectory: string;
    doodHostWorkingDirectory?: string;
    removeTemporaryDirectory?: boolean;
  },
  deps
) => {
  const {
    workingDirectory,
    doodHostWorkingDirectory,
    removeTemporaryDirectory
  } = options;
  const {
    pluginDefinitionAccessor,
    jobReporter,
    dockerRunner,
    dicomVoxelDumper
  } = deps;

  if (!workingDirectory) throw new Error('Working directory is not set');

  const baseDir = (jobId: string, forDood?: boolean) => {
    if (typeof jobId !== 'string' || !jobId.length) throw new Error();
    return path.join(
      forDood && doodHostWorkingDirectory
        ? doodHostWorkingDirectory
        : workingDirectory,
      jobId
    );
  };

  const workDir = (jobId: string, type: WorkDirType, forDood?: boolean) => {
    return path.join(baseDir(jobId, forDood), type);
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
    const timeoutMs = 2000;

    const resultsPath = path.join(outDir, 'results.json');
    logStream.write(
      `  Waiting for results.json (timeout: ${timeoutMs}ms)...\n`
    );

    //Prevent the next step until results.json is created
    try {
      await waitForFile(resultsPath, timeoutMs, 500);
    } catch (err: any) {
      logStream.write(`[ERROR] ${err.message}\n`);
      throw err;
    }

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
  const run = async (jobId: string, job: circus.PluginJobRequest) => {
    const logStream = new PassThrough();

    const writeLog = (log: string) => {
      const timeStamp = '[' + new Date().toISOString() + ']';
      logStream.write(timeStamp + ' ' + log);
    };

    try {
      const { pluginId, series, environment } = job;

      const plugin = await pluginDefinitionAccessor.get(pluginId);
      if (!plugin) throw new Error(`No such plugin: ${pluginId}`);

      await jobReporter.report(jobId, 'processing');
      await jobReporter.logStream(jobId, logStream);
      writeLog(`Runinng job ID: ${jobId}\n`);
      writeLog('Starting pre-process...\n');
      await preProcess(jobId, series, logStream);

      // mainProcess
      if (plugin.type === 'CAD') {
        if (!dockerRunner) {
          writeLog('DockerRunner is not available\n');
          throw new Error('DockerRunner is not available');
        }
        writeLog('Executing the plug-in (Docker)...\n\n');
        const { stream, promise } = await executePlugin(
          dockerRunner,
          plugin,
          workDir(jobId, 'in', true), // Plugin input dir containing volume data
          workDir(jobId, 'out', true) // Plugin output dir that will have CAD results
        );
        stream.pipe(
          logStream,
          { end: false } // Keeps the logStream open
        );
        await promise;
      } else {
        writeLog('Executing the plug-in (Remote CAD)...\n\n');
        const runConfiguration = plugin.runConfiguration;
        if (!runConfiguration)
          throw new Error('No runConfiguration in the plugin');
        const remoteAdapter = runConfiguration.adapter
          ? adapters[runConfiguration.adapter]
          : undefined;
        if (!remoteAdapter)
          throw new Error(`No such adapter: ${runConfiguration.adapter}`);
        const { logStream: remoteLogStream, result } = await remoteAdapter(
          runConfiguration.parameters,
          workDir(jobId, 'in')
        );
        for await (const line of readLine(remoteLogStream)) {
          writeLog('[Remote CAD] ' + line);
        }
        const res = await result;
        if (res.status !== 'finished')
          throw new Error(`Remote CAD failed: ${res.errorMessage}`);

        await extractTarToDir(res.resultStream, workDir(jobId, 'out'));
      }
      writeLog('\n\nPlug-in execution done. Starting post-process...\n');
      await postProcess(jobId, logStream);
      await jobReporter.report(jobId, 'finished');
      writeLog('Job execution done.\n\n');
      return true;
    } catch (e: any) {
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
