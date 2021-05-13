import path from 'path';
import fs from 'fs-extra';
import buildDicomVolumes from './buildDicomVolumes';
import { DicomFileRepository } from 'circus-lib/src/dicom-file-repository';
import createDicomVoxelDumper from './createDicomVoxelDumper';
import { PassThrough } from 'stream';

const mockDicomFileRepository: DicomFileRepository = {
  getSeries: async (seriesUid: string) => {
    const testDir = path.join(__dirname, '../../test/repository/dicom');
    return {
      load: async (image: number) => {
        const buffer = await fs.readFile(path.join(testDir, `00000001.dcm`));
        return buffer.buffer;
      },
      save: async () => {},
      images: '1-10'
    };
  },
  deleteSeries: async () => {}
};

describe('buildDicomVolume', () => {
  test('craetes raw volume file', async () => {
    const dicomVoxelDumper = await createDicomVoxelDumper(
      {},
      { dicomFileRepository: mockDicomFileRepository }
    );
    const logStream = new PassThrough();
    const tmpDestDir = path.resolve(__dirname, '../../test/build-dicom-test');
    await fs.emptyDir(tmpDestDir);
    try {
      await buildDicomVolumes(
        dicomVoxelDumper,
        [
          {
            seriesUid: '1.2.3.4.5',
            partialVolumeDescriptor: { start: 10, end: 1, delta: -1 }
          }
        ],
        tmpDestDir,
        logStream
      );
      const files = await fs.readdir(tmpDestDir);
      expect(files).toContain('0.mhd');
      expect(files).toContain('0.raw');
      expect(files).toContain('0.json');
    } finally {
      await fs.remove(tmpDestDir);
    }
  });
});
