import assert from 'node:assert/strict';
import { test } from 'node:test';
import directoryIterator from './directoryIterator.ts';
import path from 'path';

const testDir = path.join(import.meta.dirname, '../../test/dicom');
const dicomName = 'CT-MONO2-16-brain.dcm';

const toArray = async <T>(generator: AsyncGenerator<T>) => {
  const results: T[] = [];
  for await (const item of generator) results.push(item);
  return results;
};

test('directory', async () => {
  const entries = await toArray(directoryIterator(testDir));
  assert.equal(entries.length, 22);
  assert.ok(entries.find(e => e.type === 'fs'));
  assert.ok(entries.find(e => e.type === 'zip'));
});

test('regular file', async () => {
  const testFile = path.join(testDir, dicomName);
  const entries = await toArray(directoryIterator(testFile));
  assert.equal(entries.length, 1);
  assert.partialDeepStrictEqual(entries[0], { type: 'fs', name: testFile });
});

test('zip file', async () => {
  const testFile = path.join(testDir, 'test.zip');
  const entries = await toArray(directoryIterator(testFile));
  assert.equal(entries.length, 1);
  assert.partialDeepStrictEqual(entries[0], {
    type: 'zip',
    name: dicomName,
    archiveName: testFile
  });
});

test('tar.gz file', async () => {
  const testFile = path.join(testDir, '../etc/abc.tar.gz');
  const entries = await toArray(directoryIterator(testFile));
  assert.equal(entries.length, 3);
  assert.partialDeepStrictEqual(entries[0], {
    type: 'targz',
    name: 'a.txt'
  });
});

test('nonexistent file', async () => {
  const testFile = '/this/path/does/not/exist';
  await assert.rejects(toArray(directoryIterator(testFile)), {
    message: /ENOENT/
  });
});
