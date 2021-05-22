import { multirange } from 'multi-integer-range';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import createMhdPacker from './createMhdPacker';
import rawBody from 'raw-body';
import zip from 'jszip';

test('pack', async () => {
  const deps = {
    models: {
      clinicalCase: {
        findByIdOrFail: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            caseId: 'my-case-id',
            latestRevision: {
              series: [
                {
                  seriesUid: '1.2.3',
                  partialVolumeDescriptor: { start: 1, end: 10, delta: 1 },
                  labels: []
                }
              ]
            },
            createdAt: new Date('2015-01-01T00:00:00Z'),
            updatedAt: new Date('2015-01-03T12:00:00Z'),
            projectId: 'my-project-id'
          });
        })
      }
    },
    volumeProvider: jest.fn().mockImplementation(() => {
      return {
        images: multirange('1-10'),
        load: () => Promise.resolve(),
        volume: new RawData([16, 16, 10], 'uint8'),
        determinePitch: () => Promise.resolve(2.5),
        imageMetadata: {
          get: (imageNo: number) => {
            return { pixelSpacing: [2, 3, 4] };
          }
        }
      };
    }),
    blobStorage: jest.fn()
  } as any;
  const packer = await createMhdPacker({}, deps);
  const caseIds = ['my-case-id'];
  const downloadFileStream = new PassThrough();
  const taskEmitter = new EventEmitter();
  packer.packAsMhd(taskEmitter, downloadFileStream, caseIds, {
    compressionFormat: 'zip',
    labelPackType: 'isolated',
    mhdLineEnding: 'lf'
  });
  const zipFile = await rawBody(downloadFileStream);
  expect(zipFile).not.toBe(undefined);
  // Validate ZIP file
  const archive = await zip.loadAsync(zipFile);
  // data.json
  const json = JSON.parse(
    await archive.file('my-case-id/data.json').async('text')
  );
  expect(json).toEqual({
    caseId: 'my-case-id',
    projectId: 'my-project-id',
    createdAt: '2015-01-01T00:00:00.000Z',
    updatedAt: '2015-01-03T12:00:00.000Z',
    latestRevision: {
      series: [
        {
          seriesUid: '1.2.3',
          partialVolumeDescriptor: { start: 1, end: 10, delta: 1 },
          labels: []
        }
      ]
    }
  });
  // vol000.raw
  const raw = await archive.file('my-case-id/vol000.raw').async('arraybuffer');
  expect(raw.byteLength).toBe(16 * 16 * 10);
  // vol000.mhd
  const mhd = await archive.file('my-case-id/vol000.mhd').async('text');
  const lines = [
    'ObjectType = Image',
    'NDims = 3',
    'DimSize = 16 16 10',
    'ElementType = MET_UCHAR',
    'ElementSpacing = 2 3 2.5',
    'ElementByteOrderMSB = False',
    'ElementDataFile = vol000.raw'
  ];
  lines.forEach(line => expect(mhd).toContain(line));
});
