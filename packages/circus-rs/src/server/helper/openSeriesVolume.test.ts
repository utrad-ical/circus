import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import type {
  DicomImageData,
  DicomMetadata
} from '../../dicom/dicomImageExtractor.ts';
import createDicomExtractorWorker, {
  type DicomExtractorWorker
} from './extractor-worker/createDicomExtractorWorker.ts';
import openSeriesVolume, { determineSliceSpacing } from './openSeriesVolume.ts';

const uid = '1.2.3.4.5';

// A fake "DICOM file" is just the image number;
// the fake extractor makes a 2x2 int16 slice filled with it
const fakeFile = (imageNo: number) => new Int32Array([imageNo]).buffer;

const fakeExtractor = (
  override: (imageNo: number) => Partial<DicomMetadata> = () => ({})
) => {
  const fn = async (buffer: ArrayBuffer): Promise<DicomImageData> => {
    const imageNo = new Int32Array(buffer)[0];
    return {
      metadata: {
        modality: 'CT',
        columns: 2,
        rows: 2,
        pixelSpacing: [0.5, 0.5],
        pixelFormat: 'int16',
        rescale: { slope: 1, intercept: 0 },
        sliceLocation: imageNo * 1.5,
        ...override(imageNo)
      },
      pixelData: new Int16Array(4).fill(imageNo).buffer
    };
  };
  return Object.assign(fn, { dispose: async () => {} }) as DicomExtractorWorker;
};

const prepareRepository = async (images: number[]) => {
  const repo = new MemoryDicomFileRepository({});
  const series = await repo.getSeries(uid);
  for (const i of images) await series.save(i, fakeFile(i));
  return repo;
};

const readAll = async (stream: ReadableStream<Uint8Array>) => {
  const result: number[] = [];
  for await (const chunk of stream)
    result.push(new Int16Array(chunk.buffer, chunk.byteOffset)[0]);
  return result;
};

describe('openSeriesVolume', () => {
  test('reads all the images in order', async () => {
    const dicomFileRepository = await prepareRepository([3, 1, 2, 5, 4]);
    const dicomExtractorWorker = fakeExtractor();
    const { metadata, slices } = await openSeriesVolume(
      { dicomFileRepository, dicomExtractorWorker },
      uid
    );
    assert.deepEqual(metadata, {
      dimension: [2, 2, 5],
      pixelFormat: 'int16',
      elementSpacing: [0.5, 0.5, 1.5],
      imageNumbers: [1, 2, 3, 4, 5]
    });
    assert.deepEqual(await readAll(slices), [1, 2, 3, 4, 5]);
  });

  test('reads a partial volume in its order', async () => {
    const dicomFileRepository = await prepareRepository([1, 2, 3, 4, 5]);
    const dicomExtractorWorker = fakeExtractor();
    const { metadata, slices } = await openSeriesVolume(
      { dicomFileRepository, dicomExtractorWorker },
      uid,
      { start: 5, end: 1, delta: -2 }
    );
    assert.deepEqual(metadata.dimension, [2, 2, 3]);
    assert.deepEqual(metadata.imageNumbers, [5, 3, 1]);
    assert.equal(metadata.elementSpacing[2], 3);
    assert.deepEqual(await readAll(slices), [5, 3, 1]);
  });

  test('multiplies the spacing tag by the delta', async () => {
    const dicomFileRepository = await prepareRepository([1, 2, 3, 4, 5]);
    const dicomExtractorWorker = fakeExtractor(() => ({ pitch: 2 }));
    const { metadata } = await openSeriesVolume(
      { dicomFileRepository, dicomExtractorWorker },
      uid,
      { start: 1, end: 5, delta: 2 }
    );
    assert.equal(metadata.elementSpacing[2], 4);
  });

  test('rejects a partial volume not in the series', async () => {
    const dicomFileRepository = await prepareRepository([1, 2, 3]);
    const dicomExtractorWorker = fakeExtractor();
    await assert.rejects(
      openSeriesVolume({ dicomFileRepository, dicomExtractorWorker }, uid, {
        start: 2,
        end: 4,
        delta: 1
      }),
      { status: 400 }
    );
  });

  test('rejects an empty series', async () => {
    const dicomFileRepository = await prepareRepository([]);
    const dicomExtractorWorker = fakeExtractor();
    await assert.rejects(
      openSeriesVolume({ dicomFileRepository, dicomExtractorWorker }, uid),
      { status: 404 }
    );
  });

  test('errors the stream on a slice of a different size', async () => {
    const dicomFileRepository = await prepareRepository([1, 2, 3, 4]);
    const dicomExtractorWorker = fakeExtractor(no =>
      no === 4 ? { columns: 3 } : {}
    );
    const { slices } = await openSeriesVolume(
      { dicomFileRepository, dicomExtractorWorker },
      uid
    );
    await assert.rejects(readAll(slices), /different size/);
  });

  test('stops reading when canceled', async () => {
    const dicomFileRepository = await prepareRepository([1, 2, 3, 4, 5, 6]);
    const loaded: number[] = [];
    const extractor = fakeExtractor();
    const dicomExtractorWorker = Object.assign(
      (buffer: ArrayBuffer) => {
        loaded.push(new Int32Array(buffer)[0]);
        return extractor(buffer);
      },
      { dispose: extractor.dispose }
    );
    const { slices } = await openSeriesVolume(
      { dicomFileRepository, dicomExtractorWorker },
      uid
    );
    const reader = slices.getReader();
    for (let i = 0; i < 3; i++) await reader.read();
    await reader.cancel();
    // Reads at most one slice ahead
    assert.ok(loaded.length <= 4, `loaded ${loaded}`);
  });

  test('reads real DICOM files', async () => {
    const file = path.join(
      import.meta.dirname,
      '../../../test-data/dicom/CT-MONO2-16-brain.gz'
    );
    const image = zlib.unzipSync(fs.readFileSync(file));
    const dicomFileRepository = new MemoryDicomFileRepository({});
    const series = await dicomFileRepository.getSeries(uid);
    for (let i = 1; i <= 3; i++)
      await series.save(i, new Uint8Array(image).buffer);
    const dicomExtractorWorker = await createDicomExtractorWorker({
      maxConcurrency: 1
    });
    try {
      const { metadata, slices } = await openSeriesVolume(
        { dicomFileRepository, dicomExtractorWorker },
        uid
      );
      const [columns, rows, count] = metadata.dimension;
      assert.equal(metadata.pixelFormat, 'int16');
      assert.equal(count, 3);
      for await (const slice of slices)
        assert.equal(slice.byteLength, columns * rows * 2);
    } finally {
      await dicomExtractorWorker.dispose();
    }
  });
});

describe('determineSliceSpacing', () => {
  const meta = (m: Partial<DicomMetadata>) => m as DicomMetadata;
  const cases: [
    string,
    DicomMetadata,
    DicomMetadata | undefined,
    number,
    number
  ][] = [
    ['tag', meta({ pitch: 2.5 }), meta({}), 1, 2.5],
    ['negative tag', meta({ pitch: -2.5 }), meta({}), 1, 2.5],
    ['tag with delta', meta({ pitch: 2.5 }), meta({}), -2, 5],
    [
      'slice location',
      meta({ sliceLocation: 10 }),
      meta({ sliceLocation: 7 }),
      1,
      3
    ],
    ['one slice', meta({ sliceLocation: 10 }), undefined, 1, 1],
    ['no location', meta({}), meta({}), 1, 1]
  ];
  for (const [name, first, second, delta, expected] of cases) {
    test(name, () => {
      assert.equal(determineSliceSpacing(first, second, delta), expected);
    });
  }
});
