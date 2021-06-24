import { targzIterator } from './archiveIterator';
import path from 'path';
import fs from 'fs-extra';

const toArray = async <T>(generator: AsyncGenerator<T>) => {
  const results: T[] = [];
  for await (const item of generator) results.push(item);
  return results;
};

describe('targzIterator', () => {
  const testDir = path.join(__dirname, '../../test/etc/');

  test('correct tar.gz file', async () => {
    const buffer = await fs.readFile(path.join(testDir, 'abc.tar.gz'));
    const result = await toArray(targzIterator(buffer));
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ name: 'a.txt' });
    expect(result[0].buffer instanceof Buffer).toBe(true);
    expect(result[0].buffer.length).toBe(3);
  });

  test('corrupted gz file', async () => {
    // with gz signature (0x1f8b), but invalid data
    const buffer = Buffer.from([0x1f, 0x8b, 0xff, 0x33, 0x32]);
    await expect(toArray(targzIterator(buffer))).rejects.toThrow(
      'unknown compression method'
    );
  });

  test('correct gz, but not tar', async () => {
    const buffer = await fs.readFile(path.join(testDir, 'a.txt.gz'));
    await expect(toArray(targzIterator(buffer))).rejects.toThrow(
      'Unexpected end of data'
    );
  });
});
