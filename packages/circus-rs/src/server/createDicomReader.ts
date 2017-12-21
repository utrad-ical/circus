import DicomFileRepository from './dicom-file-repository/DicomFileRepository';
import DicomDumper from './dicom-dumpers/DicomDumper';
import { DicomReader } from './Server';
import DicomVolume from '../common/DicomVolume';
import AsyncLruCache from '../common/AsyncLruCache';

export default function createDicomReader(
  repository: DicomFileRepository,
  dicomDumper: DicomDumper,
  maxMemorySize: number
): DicomReader {
  return new AsyncLruCache<DicomVolume>(
    seriesUID => {
      return repository
        .getSeriesLoader(seriesUID)
        .then(loaderInfo => dicomDumper.readDicom(loaderInfo, 'all'));
    },
    {
      maxSize: maxMemorySize,
      sizeFunc: (r): number => r.dataSize
    }
  );
}
