import { Readable, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import tarfs from 'tar-fs';
import type { DicomVoxelDumper, SeriesEntry } from '../interface.ts';

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
  const { stream } = dicomVoxelDumper.dump(seriesEntries);
  logStream.write(`  Performing voxel dump...\n`);
  const extract = tarfs.extract(destDir, {
    dmode: 0o555, // all dirs should be readable
    fmode: 0o444 // all files should be readable
  });
  extract.on('entry', header => {
    logStream.write(`  Writing file: ${header.name}\n`);
  });
  return pipeline(Readable.fromWeb(stream as any), extract);
};

export default buildDicomVolumes;
