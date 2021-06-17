import archiver from 'archiver';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import tar from 'tar-stream';
import createDicomVoxelDumper, { stringifyUN } from './createDicomVoxelDumper';

const mockDicomFileRepository: DicomFileRepository = {
  getSeries: async (seriesUid: string) => {
    const testDir = path.join(__dirname, '../../test/repository/dicom');
    return {
      load: async (image: number) => {
        const buffer = await fs.readFile(
          path.join(testDir, '00000100_with_private.dcm')
        );
        return buffer.buffer;
      },
      save: async () => {},
      images: '1,5'
    };
  },
  deleteSeries: async () => {}
};

const readFromStreamTillEnd = (stream: Readable) => {
  return new Promise<string>(resolve => {
    let data = '';
    stream.on('data', chunk => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
  });
};

test('dump json', async () => {
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

  let count = 0;
  extract.on('entry', async (headers, stream, next) => {
    count++;
    expect(headers.name).toMatch(/0\.(json|mhd|raw)/);
    const content = await readFromStreamTillEnd(stream);
    if (headers.name === '0.json') {
      expect(JSON.parse(content).common).toHaveProperty('0008,0008'); // ImageType
      expect(JSON.parse(content).common['0010,0010']).toBeUndefined(); // PatientName
      expect(JSON.parse(content).common['01f1,1001']).toBe(undefined); // Acquisition Type (private tag)
    }
    next();
  });

  await new Promise((resolve, reject) => {
    extract.on('finish', resolve);
  });
  expect(count).toBe(3);
});

test('dump json including private tags', async () => {
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
    archiver('tar', { gzip: false }),
    { neededPrivateTags: ['x01f11001'] }
  );
  stream.pipe(extract);

  extract.on('entry', async (headers, stream, next) => {
    expect(headers.name).toMatch(/0\.(json|mhd|raw)/);
    const content = await readFromStreamTillEnd(stream);
    if (headers.name === '0.json') {
      expect(JSON.parse(content).common).toHaveProperty('0008,0008'); // ImageType
      expect(JSON.parse(content).common['0010,0010']).toBeUndefined(); // PatientName
      expect(JSON.parse(content).common['01f1,1001']).toBe('SPIRAL'); // Acquisition Type (private tag)
    }
    next();
  });

  await new Promise((resolve, reject) => {
    extract.on('finish', resolve);
  });
});

describe('stringifyUN', () => {
  test('ASCII', () => {
    const buf = new Uint8Array([97, 98, 99]).buffer; // 'abc'
    const result = stringifyUN(buf, 'x00000000');
    expect(result).toBe('abc');
  });

  test('Base64', () => {
    const buf = new Uint8Array([0, 1, 2, 3]).buffer;
    const result = stringifyUN(buf, 'x00000000');
    expect(result).toMatch('data:application/octet-stream;base64,AAECAw==');
  });
});
