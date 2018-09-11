import { PluginJobRequest, PluginDefinition } from '../interface';
import { PluginJobReporter } from './pluginJobReporter';
import path from 'path';
import fs from 'fs-extra';
import DockerRunner from '../util/DockerRunner';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import { PluginResultsValidator } from './pluginResultsValidator';
import { multirange, MultiRange } from 'multi-integer-range';
import { getPluginDefinitions } from '../util/info';

export interface PluginJobRunner {
  run: (jobId: string, job: PluginJobRequest) => Promise<boolean>;
}

type WorkDirType = 'in' | 'out' | 'dicom';

export default function pluginJobRunner(deps: {
  jobReporter: PluginJobReporter;
  dockerRunner: DockerRunner;
  dicomRepository: DicomFileRepository;
  workingDirectory: string;
  resultsDirectory: string;
  resultsValidator?: PluginResultsValidator;
  removeTemporaryDirectory?: boolean;
}): PluginJobRunner {
  const {
    jobReporter,
    dockerRunner,
    dicomRepository,
    workingDirectory,
    resultsDirectory,
    resultsValidator,
    removeTemporaryDirectory = true
  } = deps;

  const baseDir = (jobId: string) => {
    if (typeof jobId !== 'string' || !jobId.length) throw new Error();
    return path.join(workingDirectory, jobId);
  };

  const workDir = (jobId: string, type: WorkDirType) => {
    return path.join(baseDir(jobId), type);
  };

  const preProcess = async (jobId: string, job: PluginJobRequest) => {
    // Prepare working directories
    await fs.ensureDir(baseDir(jobId));
    await Promise.all([
      fs.ensureDir(workDir(jobId, 'in')),
      fs.ensureDir(workDir(jobId, 'out')),
      fs.ensureDir(workDir(jobId, 'dicom'))
    ]);
    // Fetches DICOM data from DicomFileRepository and builds raw volume
    const createdSeries: { [uid: string]: boolean } = {};
    const inDir = workDir(jobId, 'in');
    for (let volId = 0; volId < job.series.length; volId++) {
      const seriesUid = job.series[volId].seriesUid;
      const dicomDir = path.join(workDir(jobId, 'dicom'), seriesUid);
      if (!createdSeries[seriesUid]) {
        await fetchSeriesFromRepository(dicomRepository, seriesUid, dicomDir);
        createdSeries[seriesUid] = true;
      }
      await buildDicomVolume(dockerRunner, dicomDir, inDir);
    }
  };

  const mainProcess = async (jobId: string, job: PluginJobRequest) => {
    const plugin = (await getPluginDefinitions()).find(p => p.pluginId === job.pluginId);
    if (!plugin) {
      throw new Error(`No such plugin: ${job.pluginId}`);
    }
    await executePlugin(
      dockerRunner,
      plugin,
      workDir(jobId, 'in'), // Plugin input dir containing volume data
      workDir(jobId, 'out') // Plugin output dir that will have CAD results
    );
  };

  const postProcess = async (jobId: string, job: PluginJobRequest) => {
    const outDir = workDir(jobId, 'out');

    // Perform validation
    let results;
    if (resultsValidator) {
      try {
        const jsonStr = await fs.readFile(
          path.join(outDir, 'results.json'),
          'utf8'
        );
        const rawResults = JSON.parse(jsonStr);
        results = await resultsValidator.validate(rawResults, outDir);
      } catch (e) {
        throw new Error(`Plug-in validation failed: ${e.message}`);
      }
    }
    await jobReporter.report(jobId, 'results', results);
    // Store everything to results directory
    const resultsTarget = path.join(resultsDirectory, jobId);
    await fs.ensureDir(resultsTarget);
    await fs.copy(outDir, resultsTarget);
    // And removes the job temp directory altogether
    if (removeTemporaryDirectory) await fs.remove(baseDir(jobId));
  };

  /**
   * The whole plugin job procedure.
   */
  const run = async (jobId: string, job: PluginJobRequest) => {
    try {
      await jobReporter.report(jobId, 'processing');
      await preProcess(jobId, job);
      await mainProcess(jobId, job);
      await postProcess(jobId, job);
      await jobReporter.report(jobId, 'finished');
      return true;
    } catch (e) {
      console.error(e.message);
      await jobReporter.report(jobId, 'error');
      return false;
    }
  };

  return { run };
}

/**
 * Inspects the content of the plugin output directory
 * and returns the content of the results file.
 */
export async function readAndValidatePluginResults(outDir: string) {
  const fileContent = await fs.readFile(
    path.join(outDir, 'results.json'),
    'utf8'
  );
  const results = JSON.parse(fileContent);
  return results;
}

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
 * Builds raw volume data (and associated files) from DICOM series
 * using dicom_voxel_dump.
 * @param dockerRunner Docker runner instance.
 * @param srcDir Directory that contains a DICOM series (00000001.dcm, ...).
 * @param destDir Directory that will have the generated volume (0.vol,...).
 */
export async function buildDicomVolume(
  dockerRunner: DockerRunner,
  srcDir: string,
  destDir: string
) {
  const dockerImage = 'circus/dicom_voxel_dump:1.0';

  const result = await dockerRunner.run({
    Image: dockerImage,
    HostConfig: {
      Binds: [`${srcDir}:/data/in`, `${destDir}:/data/out`],
      AutoRemove: false
    }
  });

  if (!result) {
    throw new Error('Voxel dumper did not finish correctly.');
  }
  if (!result.match(/Export\s+result:(\d+),(\d+),(\d+)\s+Succeeded/)) {
    throw new Error('Voxel dumper returned unexpected result:\n' + result);
  }

  return [Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3)];
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
  pluginDefinition: PluginDefinition,
  srcDir: string,
  destDir: string
): Promise<string> {
  const {
    dockerImage,
    maxExecutionSeconds = 3000,
    binds: { in: bindsIn = '/circus/in', out: bindsOut = '/circus/out' } = {}
  } = pluginDefinition;

  dockerRunner.setTimeout(maxExecutionSeconds * 1000);
  const result = await dockerRunner.run({
    Image: dockerImage,
    HostConfig: {
      Binds: [`${srcDir}:${bindsIn}`, `${destDir}:${bindsOut}`],
      AutoRemove: false
    }
  });
  return result;
}
