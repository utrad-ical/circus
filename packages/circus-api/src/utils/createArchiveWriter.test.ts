import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readArchive } from '../test/util-archive.ts';
import createArchiveWriter from './createArchiveWriter.ts';

const streamOf = (...chunks: number[][]) =>
  new ReadableStream<Uint8Array>({
    start: c => {
      for (const chunk of chunks) c.enqueue(new Uint8Array(chunk));
      c.close();
    }
  });

describe('createArchiveWriter', () => {
  for (const format of ['zip', 'tgz'] as const) {
    test(`writes ${format}`, async () => {
      const writer = createArchiveWriter(format);
      const result = readArchive(format, writer.readable);
      await writer.add('a/data.json', '{"a":1}');
      await writer.add('a/bytes.raw', new Uint8Array([1, 2, 3]));
      await writer.add('a/stream.raw', streamOf([4, 5], [6]), 3);
      await writer.close();
      const files = await result;
      assert.deepEqual(
        [...files.keys()],
        ['a/data.json', 'a/bytes.raw', 'a/stream.raw']
      );
      assert.equal(
        new TextDecoder().decode(files.get('a/data.json')),
        '{"a":1}'
      );
      assert.deepEqual([...files.get('a/bytes.raw')!], [1, 2, 3]);
      assert.deepEqual([...files.get('a/stream.raw')!], [4, 5, 6]);
    });

    test(`aborts ${format}`, async () => {
      const writer = createArchiveWriter(format);
      const reader = writer.readable.getReader();
      const read = (async () => {
        while (!(await reader.read()).done);
      })();
      await writer.add('a.txt', 'abc');
      writer.abort(new Error('Oops'));
      await assert.rejects(read, /Oops/);
    });
  }

  test('requires the size of a stream in tgz', async () => {
    const writer = createArchiveWriter('tgz');
    await assert.rejects(writer.add('a.raw', streamOf([1])), /Size/);
  });
});
