import { DicomFileRepository } from 'circus-lib/src/dicom-file-repository';
import fs from 'fs-extra';
import path from 'path';
import createDicomVoxelDumper from './createDicomVoxelDumper';

test('dump json', async () => {
  const mockDicomFileRepository: DicomFileRepository = {
    getSeries: async (seriesUid: string) => {
      const testDir = path.join(__dirname, '../../test/repository/dicom');
      return {
        load: async (image: number) => {
          const buffer = await fs.readFile(path.join(testDir, '00000001.dcm'));
          return buffer.buffer;
        },
        save: async () => {},
        images: '1,5'
      };
    },
    deleteSeries: async () => {}
  };

  const result = await createDicomVoxelDumper(
    {},
    { dicomFileRepository: mockDicomFileRepository }
  );

  const dump = await result.dump([
    {
      seriesUid: '1.2.3.4.5',
      partialVolumeDescriptor: { start: 1, end: 5, delta: 4 }
    }
  ]);

  const parsed = JSON.parse(dump[0].json);
  expect(parsed.common).toHaveProperty('0008,0008');
});
