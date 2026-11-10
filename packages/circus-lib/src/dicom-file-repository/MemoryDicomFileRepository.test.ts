import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import MemoryDicomFileRepository from './MemoryDicomFileRepository.ts';

describe('MemoryDicomFileRepository', () => {
  test('save/load/delete image', async () => {
    const dr = new MemoryDicomFileRepository({});
    const series = await dr.getSeries('2.4.6.8');
    assert.equal(series.images, '');
    const input = new Uint8Array('abcde'.split('').map(c => c.charCodeAt(0)));
    await series.save(1, input.buffer as ArrayBuffer);
    const output = await series.load(1);
    assert.equal(series.images, '1');
    assert.equal(Buffer.from(output).equals(input), true);
    await assert.rejects(series.load(10), RangeError);
    // delete
    await dr.deleteSeries('2.4.6.8');
    const series2 = await dr.getSeries('2.4.6.8');
    assert.equal(series2.images, '');
  });
});
