import archiver from 'archiver';
import { DicomFileRepository } from 'circus-lib/src/dicom-file-repository';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import tar from 'tar-stream';
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

  const dumper = await createDicomVoxelDumper(
    {},
    { dicomFileRepository: mockDicomFileRepository }
  );

  const extract = tar.extract();
  const { stream } = dumper.dump(
    [
      {
        seriesUid: '1.2.3.4.5',
        partialVolumeDescriptor: { start: 1, end: 5, delta: 4 }
      }
    ],
    archiver('tar', { gzip: false })
  );
  stream.pipe(extract);

  const readFromStreamTillEnd = (stream: Readable) => {
    return new Promise<string>(resolve => {
      let data = '';
      stream.on('data', chunk => {
        data += chunk;
      });
      stream.on('end', () => resolve(data));
    });
  };

  let count = 0;
  extract.on('entry', async (headers, stream, next) => {
    count++;
    expect(headers.name).toMatch(/0\.(json|mhd|raw)/);
    const content = await readFromStreamTillEnd(stream);
    if (headers.name === '0.json') {
      expect(JSON.parse(content).common).toHaveProperty('0008,0008');
    }
    next();
  });

  await new Promise((resolve, reject) => {
    extract.on('finish', resolve);
  });
  expect(count).toBe(3);
});
