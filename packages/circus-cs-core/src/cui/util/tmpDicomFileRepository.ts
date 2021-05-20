import StaticDicomFileRepository from '@utrad-ical/circus-lib/src/dicom-file-repository/StaticDicomFileRepository';
import { multirange } from 'multi-integer-range';
import * as circus from '../../interface';
import { DicomFileRepository } from '@utrad-ical/circus-lib';

/**
 * Creates a temporary DicomFileRepository in 'run with directory' mode.
 */
const createTmpDicomFileRepository = (directories: string[]) => {
  return new StaticDicomFileRepository({
    dataDir: directories[0],
    customUidDirMap: (indexAsSeriesUid: string) => {
      const index = parseInt(indexAsSeriesUid);
      return directories[index];
    }
  });
};

export const createJobSeries = async (
  directoryMode: boolean,
  dicomFileRepository: DicomFileRepository,
  seriesUidOrDirectories: string[]
) => {
  const series: circus.JobSeries[] = [];

  for (let i = 0; i < seriesUidOrDirectories.length; i++) {
    const item = seriesUidOrDirectories[i];
    // Use index as UID when directory mode
    const seriesUid = directoryMode ? String(i) : item;
    const seriesAccessor = await dicomFileRepository.getSeries(seriesUid);
    const images = multirange(seriesAccessor.images);
    const [start, end] = images.getRanges()[0];
    series.push({
      seriesUid,
      partialVolumeDescriptor: { start, end, delta: 1 }
    });
  }
  return series;
};

export default createTmpDicomFileRepository;
