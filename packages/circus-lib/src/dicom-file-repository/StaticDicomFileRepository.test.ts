import StaticDicomFileRepository from './StaticDicomFileRepository';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('StaticDicomFileRepository', () => {
  const dataDir = path.resolve(__dirname, '../../testdata/sample-dicom');

  test('load image', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const series = await dr.getSeries('1.2.3.4.5');
    expect(series.images).toBe('1-2,4');
    const image = await series.load(2);
    expect(image).toHaveProperty('byteLength', 6);
  });

  test('save image', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const newDir = path.join(dataDir, 'new');
    const series = await dr.getSeries('new');
    const a = new Uint8Array(
      [].map.call('abcde', (c: string) => c.charCodeAt(0))
    );
    await series.save(1, a.buffer as ArrayBuffer);
    const result = await fs.readFile(path.join(newDir, '00000001.dcm'), 'utf8');
    expect(result).toBe('abcde');
    await fs.remove(newDir);
  });

  test('return count=0 for nonexistent series', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const series = await dr.getSeries('2.4.6.8.10');
    expect(series.images).toBe('');
  });
});
