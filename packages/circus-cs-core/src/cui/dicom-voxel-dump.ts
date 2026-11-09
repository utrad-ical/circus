import type { FunctionService } from '@utrad-ical/circus-lib';
import type Command from './Command.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import createDicomVoxelDumper from '../job/createDicomVoxelDumper.ts';
import buildDicomVolumes from '../job/buildDicomVolumes.ts';
import createTmpDicomFileRepository, {
  createJobSeries
} from './util/tmpDicomFileRepository.ts';

/**
 * Exports series data as CIRCUS CS input volume format.
 */
const dicomVoxelDump: FunctionService<
  Command,
  { dicomFileRepository: DicomFileRepository }
> = async (options, deps) => {
  const { dicomFileRepository } = deps;
  return async (commandName, args) => {
    const {
      _: seriesUidOrDirectories,
      d, // Use DICOM directory directly, instead of repository
      out: resultsDir
    } = args as {
      _: string[];
      d?: boolean;
      out?: string;
    };

    if (!resultsDir) {
      throw new Error('The result directory must be specified.');
    }
    if (!seriesUidOrDirectories.length) {
      throw new Error('One or more series must be specified.');
    }

    const repo: DicomFileRepository = d
      ? createTmpDicomFileRepository(seriesUidOrDirectories)
      : dicomFileRepository;

    const dicomVoxelDumper = await createDicomVoxelDumper(
      {},
      { dicomFileRepository: repo }
    );

    const series = await createJobSeries(!!d, repo, seriesUidOrDirectories);

    await buildDicomVolumes(
      dicomVoxelDumper,
      series,
      resultsDir,
      process.stdout
    );
    console.log('Export done.');
  };
};

dicomVoxelDump.dependencies = ['dicomFileRepository'];

export default dicomVoxelDump;
