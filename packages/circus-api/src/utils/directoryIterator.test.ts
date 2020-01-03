import directoryIterator from './directoryIterator';
import path from 'path';

test('directoryIterator', async () => {
  const testDir = path.join(__dirname, '../../test/dicom');
  let count = 0;
  for await (const buf of directoryIterator(testDir)) {
    expect(buf.byteLength).toBeGreaterThan(0);
    count++;
  }
  expect(count).toBe(2);
});
