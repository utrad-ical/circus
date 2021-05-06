import path from 'path';
import fs from 'fs-extra';
import buildDicomVolumes2 from './buildDicomVolumes2';
import { DicomFileRepository } from 'circus-lib/src/dicom-file-repository';
import createDicomVoxelDumper from './createDicomVoxelDumper';
import { PassThrough } from 'stream';

// const testDir = path.resolve(__dirname, '../../test/');
// const repositoryDir = path.join(testDir, 'repository/');
// const seriesUid = 'dicom';
const testDir = path.resolve(__dirname, '../../../../../data/');
const repositoryDir = path.join(testDir, 'dicom/');
const seriesUid = 'test';

const mockDicomFileRepository: DicomFileRepository = {
  getSeries: async (seriesUid: string) => {
    const testDir = '/var/circus/support-files/dixon-head-t1'; // path.join(__dirname, '../../../../../data/dicom/test');
    return {
      load: async (image: number) => {
        const fileName = String(image).padStart(8, '0');
        const buffer = await fs.readFile(path.join(testDir, `${fileName}.dcm`));
        return buffer.buffer;
      },
      save: async () => {},
      images: '1-344'
    };
  },
  deleteSeries: async () => {}
};

describe('buildDicomVolume', () => {
  test('craetes raw volume file', async () => {
    const srcDir = path.join(repositoryDir, seriesUid);
    const dicomVoxelDumper = await createDicomVoxelDumper(
      {},
      { dicomFileRepository: mockDicomFileRepository }
    );
    // const tmpDestDir = path.resolve(__dirname, '../../test/dicom-out');
    const tmpDestDir = path.resolve(__dirname, '../../../../../data2/test');
    await fs.emptyDir(tmpDestDir);
    const logStream = new PassThrough();
    try {
      await buildDicomVolumes2(
        dicomVoxelDumper,
        [
          {
            seriesUid: srcDir,
            partialVolumeDescriptor: { start: 322, end: 243, delta: -1 }
          }
        ],
        tmpDestDir,
        logStream
      );
      const files = await fs.readdir(tmpDestDir);
      expect(files).toContain('0.mhd');
      expect(files).toContain('0.raw');
      expect(files).toContain('0.txt');
    } finally {
      // await fs.remove(tmpDestDir);
    }
  });
});
