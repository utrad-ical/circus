import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import {
  createDicomExtractorWorker,
  type DicomExtractorWorker
} from '@utrad-ical/circus-rs/server';
import fs from 'fs-extra';
import { unpackTar } from 'modern-tar';
import path from 'path';
import type { SeriesEntry } from '../interface.ts';
import createDicomVoxelDumper, {
  stringifyUN
} from './createDicomVoxelDumper.ts';

const dicomFile = fs.readFileSync(
  path.join(
    import.meta.dirname,
    '../../test/repository/dicom/00000100_with_private.dcm'
  )
);

/**
 * Every image is the same file. Counts the loaded images,
 * and fails to load `failAt` if specified.
 */
const createRepository = (images: string, failAt?: number) => {
  const state = { loaded: 0 };
  const repository: DicomFileRepository = {
    getSeries: async () => ({
      load: async (image: number) => {
        if (image === failAt) throw new Error('Load error');
        state.loaded++;
        return new Uint8Array(dicomFile).buffer;
      },
      save: async () => {},
      images
    }),
    deleteSeries: async () => {}
  };
  return { repository, state };
};

const entry = (start: number, end: number, delta = 1): SeriesEntry => ({
  seriesUid: '1.2.3.4.5',
  partialVolumeDescriptor: { start, end, delta }
});

let dicomExtractorWorker: DicomExtractorWorker;

before(async () => {
  dicomExtractorWorker = await createDicomExtractorWorker({});
});

after(async () => {
  await dicomExtractorWorker.dispose();
});

const createDumper = (repository: DicomFileRepository) =>
  createDicomVoxelDumper(
    {},
    { dicomFileRepository: repository, dicomExtractorWorker }
  );

const readEntries = async (stream: ReadableStream<Uint8Array>) => {
  const entries = await unpackTar(stream);
  return new Map(entries.map(e => [e.header.name, e.data!]));
};

const json = (data: Uint8Array) => JSON.parse(new TextDecoder().decode(data));

describe('dump', () => {
  test('exports mhd, raw and json of each series', async () => {
    const { repository } = createRepository('1,5');
    const dumper = await createDumper(repository);
    const volumes: number[] = [];
    const { stream, events } = dumper.dump([entry(1, 5, 4), entry(1, 1)]);
    events.on('volume', (i: number) => volumes.push(i));
    const entries = await readEntries(stream);
    assert.deepEqual(
      [...entries.keys()],
      ['0.mhd', '0.raw', '0.json', '1.mhd', '1.raw', '1.json']
    );
    assert.deepEqual(volumes, [0, 1]);
    assert.equal(entries.get('0.raw')!.byteLength, 512 * 512 * 2 * 2);
    assert.equal(entries.get('1.raw')!.byteLength, 512 * 512 * 2);
    const mhd = new TextDecoder().decode(entries.get('0.mhd'));
    assert.match(mhd, /DimSize = 512 512 2/);
    assert.match(mhd, /ElementDataFile = 0.raw/);
  });

  test('exports DICOM tags without personal info', async () => {
    const { repository } = createRepository('1,5');
    const dumper = await createDumper(repository);
    const { stream } = dumper.dump([entry(1, 5, 4)]);
    const { common, unique } = json((await readEntries(stream)).get('0.json')!);
    assert.ok('0008,0008' in common); // ImageType
    assert.equal(common['0010,0010'], undefined); // PatientName
    assert.equal(common['01f1,1001'], undefined); // private tag
    assert.equal(unique.length, 2);
  });

  test('exports the specified private tags', async () => {
    const { repository } = createRepository('1,5');
    const dumper = await createDumper(repository);
    const { stream } = dumper.dump([entry(1, 5, 4)], {
      neededPrivateTags: ['x01f11001']
    });
    const { common } = json((await readEntries(stream)).get('0.json')!);
    assert.equal(common['01f1,1001'], 'SPIRAL'); // Acquisition Type
  });

  test('makes the stream fail when a series cannot be read', async () => {
    const { repository } = createRepository('1-5', 4);
    const dumper = await createDumper(repository);
    const { stream } = dumper.dump([entry(1, 5)]);
    await assert.rejects(readEntries(stream), { message: 'Load error' });
  });

  test('reads images only as the stream is consumed', async () => {
    const { repository, state } = createRepository('1-200');
    const dumper = await createDumper(repository);
    const { stream } = dumper.dump([entry(1, 200)]);
    await new Promise(r => setTimeout(r, 500));
    // About 8 MB of 512 KB slices are buffered
    assert.ok(state.loaded < 40, `${state.loaded} images were loaded`);
    const reader = stream.getReader();
    for (let i = 0; i < 10; i++) await reader.read();
    await reader.cancel();
    const loaded = state.loaded;
    await new Promise(r => setTimeout(r, 200));
    assert.ok(state.loaded <= loaded + 1, 'Reading continued after cancel');
  });
});

describe('stringifyUN', () => {
  test('ASCII', () => {
    const buf = new Uint8Array([97, 98, 99]).buffer; // 'abc'
    const result = stringifyUN(buf, 'x00000000');
    assert.equal(result, 'abc');
  });

  test('Base64', () => {
    const buf = new Uint8Array([0, 1, 2, 3]).buffer;
    const result = stringifyUN(buf, 'x00000000');
    assert.ok(result.includes('data:application/octet-stream;base64,AAECAw=='));
  });

  test('Rejects large binary', () => {
    const buf = new Uint8Array(10000000).buffer;
    assert.throws(() => stringifyUN(buf, 'x00000000'), {
      message: /Data of the private tag x00000000 is too large/
    });
  });
});
