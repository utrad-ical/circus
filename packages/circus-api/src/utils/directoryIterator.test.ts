import directoryIterator from './directoryIterator';
import path from 'path';

const testDir = path.join(__dirname, '../../test/dicom');
const dicomName = 'CT-MONO2-16-brain.dcm';

const toArray = async <T>(generator: AsyncGenerator<T>) => {
  const results: T[] = [];
  for await (const item of generator) results.push(item);
  return results;
};

test('directory', async () => {
  const entries = await toArray(directoryIterator(testDir));
  expect(entries).toHaveLength(22);
  expect(entries.find(e => e.type === 'fs')).toBeTruthy();
  expect(entries.find(e => e.type === 'zip')).toBeTruthy();
});

test('regular file', async () => {
  const testFile = path.join(testDir, dicomName);
  const entries = await toArray(directoryIterator(testFile));
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ type: 'fs', name: testFile });
});

test('zip file', async () => {
  const testFile = path.join(testDir, 'test.zip');
  const entries = await toArray(directoryIterator(testFile));
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    type: 'zip',
    name: dicomName,
    zipName: testFile
  });
});

test('tar.gz file', async () => {
  const testFile = path.join(testDir, '../etc/abc.tar.gz');
  const entries = await toArray(directoryIterator(testFile));
  expect(entries).toHaveLength(3);
  expect(entries[0]).toMatchObject({
    type: 'targz',
    name: 'a.txt'
  });
});

test('nonexistent file', async () => {
  const testFile = '/this/path/does/not/exist';
  await expect(toArray(directoryIterator(testFile))).rejects.toThrow(/ENOENT/);
});
