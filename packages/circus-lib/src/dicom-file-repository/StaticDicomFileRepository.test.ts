import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import StaticDicomFileRepository from './StaticDicomFileRepository.ts';
import path from 'path';
import fs from 'fs-extra';

describe('StaticDicomFileRepository', () => {
  const dataDir = path.resolve(__dirname, '../../testdata/sample-dicom');

  test('load image', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const series = await dr.getSeries('1.2.3.4.5');
    assert.equal(series.images, '1-2,4');
    const image = await series.load(2);
    assert.deepEqual(image['byteLength'], 6);
  });

  test('save/delete image', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const newDir = path.join(dataDir, 'new');
    const series = await dr.getSeries('new');
    const a = new Uint8Array('abcde'.split('').map(c => c.charCodeAt(0)));
    await series.save(1, a.buffer as ArrayBuffer);
    const result = await fs.readFile(path.join(newDir, '00000001.dcm'), 'utf8');
    assert.equal(result, 'abcde');

    await dr.deleteSeries('new');
    assert.equal(await fs.pathExists(newDir), false);
    const series2 = await dr.getSeries('new');
    assert.equal(series2.images, '');
  });

  test('return count=0 for nonexistent series', async () => {
    const dr = new StaticDicomFileRepository({ dataDir });
    const series = await dr.getSeries('2.4.6.8.10');
    assert.equal(series.images, '');
  });
});
