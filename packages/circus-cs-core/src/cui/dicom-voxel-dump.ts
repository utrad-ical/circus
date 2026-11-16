import type { FunctionService } from '@utrad-ical/circus-lib';
import type Command from './Command.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import createDicomVoxelDumper from '../job/createDicomVoxelDumper.ts';
import type { DicomExtractorWorker } from '@utrad-ical/circus-rs/server';
import buildDicomVolumes from '../job/buildDicomVolumes.ts';
import createTmpDicomFileRepository, {
  createJobSeries
} from './util/tmpDicomFileRepository.ts';

/**
 * Exports series data as CIRCUS CS input volume format.
 */
const dicomVoxelDump: FunctionService<
  Command,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  }
> = async (options, deps) => {
  const { dicomFileRepository, dicomExtractorWorker } = deps;
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
      { dicomFileRepository: repo, dicomExtractorWorker }
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

dicomVoxelDump.dependencies = ['dicomFileRepository', 'dicomExtractorWorker'];

export default dicomVoxelDump;
