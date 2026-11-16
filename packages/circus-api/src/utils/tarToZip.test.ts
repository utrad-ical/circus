import assert from 'node:assert/strict';
import { test } from 'node:test';
import { packTar } from 'modern-tar';
import { readArchive } from '../test/util-archive.ts';
import tarToZip from './tarToZip.ts';

const toStream = (data: Uint8Array<ArrayBuffer>) => new Blob([data]).stream();

test('converts a tar into a zip', async () => {
  const big = new Uint8Array(300_000).map((_, i) => i % 251);
  const tar = await packTar([
    { header: { name: 'dir', type: 'directory', size: 0 } },
    { header: { name: 'dir/a.txt', type: 'file', size: 5 }, body: 'alpha' },
    { header: { name: 'b.raw', type: 'file', size: big.length }, body: big },
    { header: { name: 'empty', type: 'file', size: 0 }, body: '' }
  ]);
  const files = await readArchive('zip', tarToZip(toStream(tar)));
  assert.deepEqual([...files.keys()], ['dir/a.txt', 'b.raw', 'empty']);
  assert.equal(new TextDecoder().decode(files.get('dir/a.txt')), 'alpha');
  assert.deepEqual(files.get('b.raw'), big);
  assert.equal(files.get('empty')!.length, 0);
});

test('fails when the tar is broken', async () => {
  const tar = await packTar([
    { header: { name: 'a.txt', type: 'file', size: 5 }, body: 'alpha' }
  ]);
  const broken = new ReadableStream<Uint8Array>({
    start: controller => {
      controller.enqueue(tar.subarray(0, 600));
      controller.error(new Error('Source error'));
    }
  });
  await assert.rejects(readArchive('zip', tarToZip(broken)));
});
