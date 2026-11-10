import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import createDockerFileExtractor from './dockerFileExtractor.ts';
import tar from 'tar-stream';
import rawBody from 'raw-body';
import path from 'path';
import fs from 'fs-extra';

const elfSignature = '7f454c46';

test('extract file from hello-world', async () => {
  const extractor = createDockerFileExtractor('hello-world');
  try {
    const stream = await extractor.extract('/hello');
    const unpack = tar.extract();
    const result: any[] = [];
    unpack.on('entry', async (header, stream, next) => {
      result.push({ header, buffer: await rawBody(stream) });
      next();
    });
    stream.pipe(unpack);
    await new Promise(resolve => {
      unpack.on('finish', resolve);
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].buffer.slice(0, 4).toString('hex'), elfSignature);
  } finally {
    await extractor.dispose();
  }
});

const testDir = path.resolve(import.meta.dirname, '../../test');

describe('extractToPath', () => {
  test('succeed', async () => {
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

  test('nonexistent path', async () => {
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
