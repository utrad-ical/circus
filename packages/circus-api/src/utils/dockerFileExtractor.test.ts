import assert from 'node:assert/strict';
import { buffer } from 'node:stream/consumers';
import { describe, test } from 'node:test';
import createDockerFileExtractor from './dockerFileExtractor.ts';
import { unpackTar } from 'modern-tar';
import path from 'path';
import fs from 'fs-extra';

const elfSignature = '7f454c46';

test('extracts a file from the hello-world image', async () => {
  const extractor = createDockerFileExtractor('hello-world');
  try {
    const stream = await extractor.extract('/hello');
    const entries = await unpackTar(await buffer(stream));
    assert.equal(entries.length, 1);
    const { data } = entries[0];
    assert.ok(data);
    assert.equal(
      Buffer.from(data.subarray(0, 4)).toString('hex'),
      elfSignature
    );
  } finally {
    await extractor.dispose();
  }
});

const testDir = path.resolve(import.meta.dirname, '../../test');

describe('extractToPath', () => {
  test('extracts the file to the destination directory', async () => {
    const extractor = createDockerFileExtractor('hello-world');
    const destFile = path.join(testDir, 'hello');
    try {
      await extractor.extractToPath('/hello', testDir);
      const buf = await fs.readFile(destFile);
      assert.equal(buf.slice(0, 4).toString('hex'), elfSignature);
    } finally {
      await fs.remove(destFile);
      await extractor.dispose();
    }
  });

  test('rejects a path that does not exist in the image', async () => {
    const extractor = createDockerFileExtractor('hello-world');
    try {
      await assert.rejects(
        () => extractor.extractToPath('/dummy-path', testDir),
        { message: /No such container:path|Could not find the file/ }
      );
    } finally {
      extractor.dispose();
    }
  });
});
