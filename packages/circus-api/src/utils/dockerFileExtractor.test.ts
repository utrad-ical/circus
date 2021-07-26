import createDockerFileExtractor from './dockerFileExtractor';
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
    expect(result).toHaveLength(1);
    expect(result[0].buffer.slice(0, 4).toString('hex')).toBe(elfSignature);
  } finally {
    await extractor.dispose();
  }
});

const testDir = path.resolve(__dirname, '../../test');

describe('extractToPath', () => {
  test('succeed', async () => {
    const extractor = createDockerFileExtractor('hello-world');
    const destFile = path.join(testDir, 'hello');
    try {
      await extractor.extractToPath('/hello', testDir);
      const buf = await fs.readFile(destFile);
      expect(buf.slice(0, 4).toString('hex')).toBe(elfSignature);
    } finally {
      await fs.remove(destFile);
      await extractor.dispose();
    }
  });

  test('nonexistent path', async () => {
    const extractor = createDockerFileExtractor('hello-world');
    try {
      await expect(() =>
        extractor.extractToPath('/dummy-path', testDir)
      ).rejects.toThrow(/No such container:path/);
    } finally {
      extractor.dispose();
    }
  });
});
