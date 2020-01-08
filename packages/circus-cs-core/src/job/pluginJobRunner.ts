import path from 'path';
import fs from 'fs-extra';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import pluginResultsValidator from './pluginResultsValidator';
import { MultiRange } from 'multi-integer-range';
import { FunctionService } from '@utrad-ical/circus-lib';
import buildDicomVolumes from './buildDicomVolumes';
import tarfs from 'tar-fs';
import stream from 'stream';
import * as circus from '../interface';

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
    dicomRepository: DicomFileRepository;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    dockerRunner: DockerRunner;
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
    dicomRepository,
    pluginDefinitionAccessor,
    jobReporter,
    dockerRunner
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
    const createdSeries: { [uid: string]: boolean } = {};
    const inDir = workDir(jobId, 'in');
    for (let volId = 0; volId < series.length; volId++) {
      logStream.write(`  Building DICOM volume for vol #${volId}...\n`);
      const seriesUid = series[volId].seriesUid;
      const dicomDir = path.join(workDir(jobId, 'dicom'), seriesUid);
      if (!createdSeries[seriesUid]) {
        await fetchSeriesFromRepository(dicomRepository, seriesUid, dicomDir);
        createdSeries[seriesUid] = true;
      }
      await buildDicomVolumes(dockerRunner, [dicomDir], inDir);
    }
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
    logStream: stream.Writable = new stream.PassThrough()
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
  'dicomFileRepository',
  'pluginDefinitionAccessor',
  'dockerRunner'
];
export default pluginJobRunner;

/**
 * Extracts the entire series from DICOM repository
 * into the speicied path on the local file system.
 * @param dicomRepository The DICOM repositoty from which the series is fetched.
 * @param seriesUid The series instance UID.
 * @param destDir The path to the destination directory.
 */
export async function fetchSeriesFromRepository(
  dicomRepository: DicomFileRepository,
  seriesUid: string,
  destDir: string
) {
  await fs.ensureDir(destDir);
  const { load, images } = await dicomRepository.getSeries(seriesUid);
  let it = new MultiRange(images).getIterator(),
    next;
  while (!(next = it.next()).done) {
    const i: number = next.value!;
    const image = await load(i);
    await fs.writeFile(
      path.join(destDir, ('00000000' + i).slice(-8) + '.dcm'),
      Buffer.from(image)
    );
  }
}

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
