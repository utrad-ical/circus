import { DicomVoxelDumper, SeriesEntry } from '../interface';
import fs from 'fs-extra';
import path from 'path';
import { Writable } from 'stream';

/**
 * Builds raw volume data (and associated files) from DICOM series
 * using dicom_voxel_dump.
 * @param dicomVoxelDumper
 * @param seriesEntries
 * @param destDir Directory that will have the generated volume (0.vol,...).
 */
const buildDicomVolumes2 = async (
  dicomVoxelDumper: DicomVoxelDumper,
  seriesEntries: SeriesEntry[],
  destDir: string,
  logStream: Writable
) => {
  const dumpFiles = await dicomVoxelDumper.dump(seriesEntries);
  for (let i = 0; i < dumpFiles.length; i++) {
    logStream.write(`  Building DICOM volume for vol #${i}...\n`);
    await fs.writeFile(path.join(destDir, `${i}.mhd`), dumpFiles[i].mhd);
    await fs.writeFile(
      path.join(destDir, `${i}.raw`),
      Buffer.from(dumpFiles[i].raw)
    );
    await fs.writeFile(path.join(destDir, `${i}.txt`), dumpFiles[i].json);
  }
};

export default buildDicomVolumes2;
