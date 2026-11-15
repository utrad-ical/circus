import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import type {
  DicomExtractorWorker,
  PartialVolumeDescriptor
} from '@utrad-ical/circus-rs/server';
import createMemoryStorage from '../storage/MemoryStorage.ts';
import { readArchive } from '../test/util-archive.ts';
import createMhdPacker, { type PackOptions } from './createMhdPacker.ts';

const uid = '1.2.3';
const caseId = 'my-case-id';
const hash = 'a'.repeat(40);

// A fake "DICOM file" is just the image number;
// the fake extractor makes a 2x2 uint8 slice filled with it
const dicomExtractorWorker = Object.assign(
  async (buffer: ArrayBuffer) => {
    const imageNo = new Int32Array(buffer)[0];
    return {
      metadata: {
        modality: 'CT',
        columns: 2,
        rows: 2,
        pixelSpacing: [0.5, 0.5],
        pixelFormat: 'uint8',
        rescale: { slope: 1, intercept: 0 },
        sliceLocation: imageNo * 2
      },
      pixelData: new Uint8Array(4).fill(imageNo).buffer
    };
  },
  { dispose: async () => {} }
) as DicomExtractorWorker;

const voxelLabel = (origin: number[]) => ({
  type: 'voxel',
  data: { voxels: hash, origin, size: [2, 2, 1] }
});

const setUp = async (
  pvd: PartialVolumeDescriptor | undefined,
  labels: any[] = []
) => {
  const rev = {
    series: [{ seriesUid: uid, partialVolumeDescriptor: pvd, labels }]
  };
  const caseData = {
    caseId,
    projectId: 'my-project-id',
    revisions: [rev],
    createdAt: new Date('2015-01-01T00:00:00Z'),
    updatedAt: new Date('2015-01-03T12:00:00Z')
  };
  const dicomFileRepository = new MemoryDicomFileRepository({});
  const series = await dicomFileRepository.getSeries(uid);
  for (let i = 1; i <= 6; i++) await series.save(i, new Int32Array([i]).buffer);
  const blobStorage = await createMemoryStorage(undefined);
  // 2x2x1 binary voxels, all set
  await blobStorage.write(hash, Buffer.from([0xff]));
  const apiLogger = { error: mock.fn() };
  const packer = await createMhdPacker(undefined, {
    models: {
      clinicalCase: {
        findById: async (id: string) => (id === caseId ? caseData : undefined)
      },
      series: {
        findById: async (id: string) =>
          id === uid ? { seriesUid: uid, images: '1-6' } : undefined
      }
    } as any,
    dicomFileRepository,
    dicomExtractorWorker,
    blobStorage,
    apiLogger: apiLogger as any
  });
  return { packer, dicomFileRepository, apiLogger };
};

const defaultOptions: PackOptions = {
  volume: 'pvd',
  labelPackType: 'isolated',
  mhdLineEnding: 'lf',
  compressionFormat: 'zip'
};

const exportCase = async (
  packer: Awaited<ReturnType<typeof setUp>>['packer'],
  options: Partial<PackOptions> = {},
  reporter?: any
) => {
  const opts = { ...defaultOptions, ...options };
  const prepared = await packer.prepare([{ caseId }], opts.volume);
  const stream = packer.pack(prepared, opts, reporter);
  return await readArchive(opts.compressionFormat, stream);
};

const text = (data?: Uint8Array) => new TextDecoder().decode(data);

const dimSize = (mhd?: Uint8Array) => /DimSize = (.*)/.exec(text(mhd))![1];

describe('createMhdPacker', () => {
  test('exports the partial volume', async () => {
    const { packer } = await setUp({ start: 3, end: 5, delta: 1 }, [
      voxelLabel([0, 0, 1])
    ]);
    const files = await exportCase(packer);
    assert.deepEqual(
      [...files.keys()],
      [
        `${caseId}/data.json`,
        `${caseId}/vol000.raw`,
        `${caseId}/vol000.mhd`,
        `${caseId}/vol000-label000.raw`,
        `${caseId}/vol000-label000.mhd`
      ]
    );
    const json = JSON.parse(text(files.get(`${caseId}/data.json`)));
    assert.equal(json.createdAt, '2015-01-01T00:00:00.000Z');
    assert.deepEqual(json.originalSeriesMeta, { [uid]: { images: '1-6' } });
    assert.deepEqual(
      [...files.get(`${caseId}/vol000.raw`)!],
      [3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]
    );
    const mhd = text(files.get(`${caseId}/vol000.mhd`));
    assert.match(mhd, /DimSize = 2 2 3/);
    assert.match(mhd, /ElementSpacing = 0.5 0.5 2/);
    assert.match(mhd, /ElementDataFile = vol000.raw/);
    // The label is on the second slice (image #4), as the volume
    assert.deepEqual(
      [...files.get(`${caseId}/vol000-label000.raw`)!],
      [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
    );
    assert.equal(dimSize(files.get(`${caseId}/vol000-label000.mhd`)), '2 2 3');
  });

  test('exports a reversed partial volume', async () => {
    const { packer } = await setUp({ start: 5, end: 3, delta: -1 }, [
      voxelLabel([0, 0, 0])
    ]);
    const files = await exportCase(packer);
    assert.deepEqual(
      [...files.get(`${caseId}/vol000.raw`)!],
      [5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3]
    );
    assert.deepEqual(
      [...files.get(`${caseId}/vol000-label000.raw`)!],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
    );
  });

  test('exports the whole series with the labels in the partial volume', async () => {
    const { packer } = await setUp({ start: 2, end: 6, delta: 2 }, [
      voxelLabel([0, 0, 1])
    ]);
    const files = await exportCase(packer, { volume: 'series' });
    assert.equal(files.get(`${caseId}/vol000.raw`)!.length, 2 * 2 * 6);
    assert.equal(dimSize(files.get(`${caseId}/vol000.mhd`)), '2 2 6');
    assert.match(
      text(files.get(`${caseId}/vol000.mhd`)),
      /ElementSpacing = 0.5 0.5 2/
    );
    const labelMhd = text(files.get(`${caseId}/vol000-label000.mhd`));
    assert.match(labelMhd, /DimSize = 2 2 3/);
    assert.match(labelMhd, /ElementSpacing = 0.5 0.5 4/);
    assert.deepEqual(
      [...files.get(`${caseId}/vol000-label000.raw`)!],
      [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
    );
  });

  test('uses the first range of the series without a partial volume', async () => {
    const { packer } = await setUp(undefined);
    const files = await exportCase(packer);
    assert.equal(dimSize(files.get(`${caseId}/vol000.mhd`)), '2 2 6');
  });

  test('combines labels', async () => {
    const { packer } = await setUp({ start: 1, end: 2, delta: 1 }, [
      voxelLabel([0, 0, 0]),
      { type: 'rectangle', data: {} },
      voxelLabel([0, 0, 1])
    ]);
    const files = await exportCase(packer, {
      labelPackType: 'combined',
      compressionFormat: 'tgz'
    });
    assert.deepEqual(
      [...files.get(`${caseId}/vol000-label.raw`)!],
      [1, 1, 1, 1, 3, 3, 3, 3]
    );
    assert.equal(dimSize(files.get(`${caseId}/vol000-label.mhd`)), '2 2 2');
  });

  test('reports the progress per slice', async () => {
    const { packer } = await setUp({ start: 1, end: 3, delta: 1 });
    const reporter = { report: mock.fn(), finish: mock.fn(), fail: mock.fn() };
    await exportCase(packer, {}, reporter);
    assert.deepEqual(
      reporter.report.mock.calls.map(c => c.arguments),
      [
        [`Packing ${caseId} vol000 (1/3)`, 1, 3],
        [`Packing ${caseId} vol000 (2/3)`, 2, 3],
        [`Packing ${caseId} vol000 (3/3)`, 3, 3]
      ]
    );
    assert.equal(reporter.finish.mock.callCount(), 1);
  });

  test('rejects invalid targets before packing', async () => {
    const { packer } = await setUp({ start: 5, end: 8, delta: 1 });
    await assert.rejects(packer.prepare([{ caseId: 'none' }], 'pvd'), {
      status: 400
    });
    await assert.rejects(
      packer.prepare([{ caseId, revisionIndex: 1 }], 'pvd'),
      { status: 400 }
    );
    await assert.rejects(packer.prepare([{ caseId }], 'pvd'), {
      status: 400,
      message: /partial volume/
    });
  });

  test('fails the stream on an error during packing', async () => {
    const { packer, dicomFileRepository, apiLogger } = await setUp({
      start: 1,
      end: 6,
      delta: 1
    });
    await dicomFileRepository.deleteSeries(uid);
    const reporter = { report: mock.fn(), finish: mock.fn(), fail: mock.fn() };
    await assert.rejects(exportCase(packer, {}, reporter));
    assert.equal(reporter.fail.mock.callCount(), 1);
    assert.equal(apiLogger.error.mock.callCount(), 1);
  });
});
