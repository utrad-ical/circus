import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';
import { packTar } from 'modern-tar';
import archiveEntries from './archiveEntries.ts';

const text = (s: string) => new TextEncoder().encode(s);

const files = { 'a.txt': text('alpha'), 'dir/b.txt': text('bravo') };

const makeZip = async (level: number, dataDescriptor = true) => {
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
    level,
    dataDescriptor
  });
  for (const [name, data] of Object.entries(files))
    await writer.add(name, new Uint8ArrayReader(data));
  return await writer.close();
};

const makeTgz = async () => {
  const tar = await packTar(
    Object.entries(files).map(([name, body]) => ({
      header: { name, size: body.length, type: 'file' as const },
      body
    }))
  );
  return new Uint8Array(
    await new Response(
      new Blob([tar]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer()
  );
};

const readEntries = async (
  data: Uint8Array<ArrayBuffer>,
  name: string,
  max = 100
) => {
  const result: Record<string, string> = {};
  for await (const entry of archiveEntries(new Blob([data]).stream(), name, {
    maxEntryBytes: max
  })) {
    try {
      result[entry.name] = new TextDecoder().decode(await entry.bytes());
    } catch (err: any) {
      result[entry.name] = `Error: ${err.message}`;
    }
  }
  return result;
};

describe('archiveEntries', () => {
  test('reads a plain file as is', async () => {
    assert.deepEqual(await readEntries(text('hello'), 'x.dcm'), {
      'x.dcm': 'hello'
    });
    assert.deepEqual(await readEntries(new Uint8Array(0), 'empty'), {
      empty: ''
    });
  });

  test('reads a zip file, compressed or stored', async () => {
    for (const zip of [await makeZip(5), await makeZip(0, false)]) {
      assert.deepEqual(await readEntries(zip, 'a.zip'), {
        'a.zip/a.txt': 'alpha',
        'a.zip/dir/b.txt': 'bravo'
      });
    }
  });

  test('rejects a stored zip entry with its size after the data', async () => {
    await assert.rejects(readEntries(await makeZip(0, true), 'a.zip'), {
      message: /cannot be read while uploading/
    });
  });

  test('reads a tar.gz file', async () => {
    assert.deepEqual(await readEntries(await makeTgz(), 'a.tgz'), {
      'a.tgz/a.txt': 'alpha',
      'a.tgz/dir/b.txt': 'bravo'
    });
  });

  test('skips entries that are not read', async () => {
    for (const data of [await makeZip(5), await makeTgz()]) {
      const names: string[] = [];
      for await (const entry of archiveEntries(new Blob([data]).stream(), 'x', {
        maxEntryBytes: 100
      }))
        names.push(entry.name);
      assert.deepEqual(names, ['x/a.txt', 'x/dir/b.txt']);
    }
  });

  test('rejects an entry over the size limit', async () => {
    const error = 'Error: The file exceeds the size limit (4 bytes).';
    assert.deepEqual(await readEntries(await makeTgz(), 'a.tgz', 4), {
      'a.tgz/a.txt': error,
      'a.tgz/dir/b.txt': error
    });
    assert.deepEqual(await readEntries(await makeZip(5), 'a.zip', 4), {
      'a.zip/a.txt': error,
      'a.zip/dir/b.txt': error
    });
  });

  test('throws on a broken archive', async () => {
    const zip = await makeZip(5);
    await assert.rejects(readEntries(zip.slice(0, 40), 'a.zip'));
    const tgz = await makeTgz();
    await assert.rejects(readEntries(tgz.slice(0, 20), 'a.tgz'));
  });
});
