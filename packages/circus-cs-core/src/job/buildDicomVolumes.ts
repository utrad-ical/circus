import archiver from 'archiver';
import { Writable } from 'stream';
import tarfs from 'tar-fs';
import { DicomVoxelDumper, SeriesEntry } from '../interface';

/**
 * Builds raw volume data (and associated files) from DICOM series
 * using dicom_voxel_dump.
 * @param dicomVoxelDumper
 * @param seriesEntries
 * @param destDir Directory that will have the generated volume (0.vol,...).
 */
const buildDicomVolumes = (
  dicomVoxelDumper: DicomVoxelDumper,
  seriesEntries: SeriesEntry[],
  destDir: string,
  logStream: Writable
) => {
  const pack = archiver('tar', { gzip: false });
  const { stream } = dicomVoxelDumper.dump(seriesEntries, pack);
  logStream.write(`  Performing voxel dump...\n`);
  return new Promise<void>((resolve, reject) => {
    const extract = tarfs.extract(destDir, {
      dmode: 0o555, // all dirs should be readable
      fmode: 0o444 // all files should be readable
    });
    stream.pipe(extract);
    extract.on('entry', (header, stream, next) => {
      logStream.write(`  Writing file: ${header.name}\n`);
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
  });
};

export default buildDicomVolumes;
