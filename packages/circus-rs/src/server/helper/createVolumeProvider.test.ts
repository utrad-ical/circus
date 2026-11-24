import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import type {
  DicomImageData,
  DicomMetadata
} from '../../dicom/dicomImageExtractor.ts';
import createVolumeProvider from './createVolumeProvider.ts';
import type { DicomExtractorWorker } from './extractor-worker/createDicomExtractorWorker.ts';

const uid = '1.2.3.4.5';

// A fake "DICOM file" is just the image number;
// the fake extractor makes an int16 slice filled with it
const fakeExtractor = (
  override: (imageNo: number) => Partial<DicomMetadata> = () => ({})
) => {
  const fn = async (buffer: ArrayBuffer): Promise<DicomImageData> => {
    const imageNo = new Int32Array(buffer)[0];
    const metadata: DicomMetadata = {
      modality: 'CT',
      columns: 2,
      rows: 2,
      pixelSpacing: [0.5, 0.5],
      pixelFormat: 'int16',
      rescale: { slope: 1, intercept: 0 },
      sliceLocation: imageNo * 1.5,
      imageOrientationPatient: '1\\0\\0\\0\\1\\0',
      ...override(imageNo)
    };
    const pixelData = new Int16Array(metadata.columns * metadata.rows);
    return { metadata, pixelData: pixelData.fill(imageNo).buffer };
  };
  return Object.assign(fn, { dispose: async () => {} }) as DicomExtractorWorker;
};

/** A repository that counts the file reads */
const prepareRepository = async (count: number) => {
  const repo = new MemoryDicomFileRepository({});
  const series = await repo.getSeries(uid);
  for (let i = 1; i <= count; i++)
    await series.save(i, new Int32Array([i]).buffer);
  const reads: number[] = [];
  const dicomFileRepository = {
    getSeries: async (seriesUid: string) => {
      const accessor = await repo.getSeries(seriesUid);
      return {
        ...accessor,
        images: accessor.images,
        load: (image: number) => {
          reads.push(image);
          return accessor.load(image);
        }
      };
    },
    deleteSeries: (seriesUid: string) => repo.deleteSeries(seriesUid)
  };
  return { dicomFileRepository, reads };
};

test('reads each file once', async () => {
  const { dicomFileRepository, reads } = await prepareRepository(5);
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker: fakeExtractor() }
  );
  const accessor = await provider(uid);
  await accessor.load('1-5');
  assert.equal(await accessor.isLike3d(), true);
  assert.equal(await accessor.determinePitch(), 1.5);
  assert.deepEqual(
    reads.toSorted((a, b) => a - b),
    [1, 2, 3, 4, 5]
  );
});

test('shares a series being loaded among concurrent requests', async () => {
  const { dicomFileRepository, reads } = await prepareRepository(3);
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker: fakeExtractor() }
  );
  const [a, b] = await Promise.all([provider(uid), provider(uid)]);
  assert.equal(a, b);
  await a.load('1-3');
  assert.equal(reads.length, 3);
});

test('rejects an image whose size differs without writing it', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const { dicomFileRepository } = await prepareRepository(3);
    const dicomExtractorWorker = fakeExtractor(imageNo =>
      imageNo === 2 ? { columns: 1 } : {}
    );
    const provider = await createVolumeProvider(
      {},
      { dicomFileRepository, dicomExtractorWorker }
    );
    const accessor = await provider(uid);
    await assert.rejects(
      accessor.load(2),
      /Image #2 is 1x2, while the first image is 2x2/
    );
    await accessor.load(3);
    const slice = new Int16Array(accessor.volume.getSingleImage(1));
    assert.deepEqual([...slice], [0, 0, 0, 0]);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('determines the slice spacing of a partial volume from its own images', async () => {
  const { dicomFileRepository } = await prepareRepository(5);
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker: fakeExtractor() }
  );
  const accessor = await provider(uid);
  assert.equal(await accessor.determinePitch(), 1.5);
  assert.equal(await accessor.determinePitch([1, 3, 5]), 3);
  assert.equal(await accessor.determinePitch([5, 4, 3]), 1.5);
});

test('uses 1 as the slice spacing when it cannot be determined', async () => {
  const { dicomFileRepository } = await prepareRepository(3);
  const dicomExtractorWorker = fakeExtractor(() => ({
    sliceLocation: undefined
  }));
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker }
  );
  const accessor = await provider(uid);
  assert.equal(await accessor.determinePitch(), 1);
});

test('determines if a partial volume is 3D from its own images', async () => {
  const { dicomFileRepository } = await prepareRepository(5);
  // The first two images do not look like a part of a 3D volume
  const dicomExtractorWorker = fakeExtractor(imageNo =>
    imageNo <= 2 ? { pixelDataCharacteristics: 'DERIVED' } : {}
  );
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker }
  );
  const accessor = await provider(uid);
  assert.equal(await accessor.isLike3d(), false);
  assert.equal(await accessor.isLike3d([3, 4, 5]), true);
});

test('preserves the whole-series 3D check after inspecting a partial volume', async () => {
  const { dicomFileRepository } = await prepareRepository(3);
  let release!: () => void;
  const gate = new Promise<void>(resolve => (release = resolve));
  const extract = fakeExtractor(imageNo =>
    imageNo === 3 ? { pixelDataCharacteristics: 'DERIVED' } : {}
  );
  const dicomExtractorWorker = Object.assign(
    async (buffer: ArrayBuffer) => {
      if (new Int32Array(buffer)[0] === 3) await gate;
      return extract(buffer);
    },
    { dispose: async () => {} }
  ) as DicomExtractorWorker;
  const provider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomExtractorWorker }
  );
  const accessor = await provider(uid);
  assert.equal(await accessor.isLike3d(), true);
  assert.equal(await accessor.isLike3d([1, 2]), true);
  release();
  await assert.rejects(accessor.load(3), {
    message:
      'Image #3 does not look like a part of the 3D volume that the first images make.',
    expose: true
  });
});
