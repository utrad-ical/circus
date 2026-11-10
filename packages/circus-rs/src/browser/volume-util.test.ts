import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import RawData from '../common/RawData.ts';
import * as vu from './volume-util.ts';

describe('scanBoundingBox', () => {
  test('should return null for volume with all zeros', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    const box = vu.scanBoundingBox(vol);
    assert.equal(box, null);
  });

  test('should return correct box for volume with some non-zeros', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    vol.writePixelAt(1, 5, 5, 5);
    vol.writePixelAt(1, 5, 6, 7);
    const box = vu.scanBoundingBox(vol);
    assert.deepEqual(box, { origin: [5, 5, 5], size: [1, 2, 3] });
  });

  test('should snap x-size to the multiple of 8', () => {
    const vol = new RawData([8, 8, 8], 'binary');
    vol.writePixelAt(1, 5, 5, 5);
    vol.writePixelAt(1, 5, 6, 7);
    const box = vu.scanBoundingBox(vol, true); // snap
    assert.deepEqual(box, { origin: [5, 5, 5], size: [8, 2, 3] });
  });

  test('should return correct box for volume with all non-zeros', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    vol.fillAll(1);
    const box = vu.scanBoundingBox(vol);
    assert.deepEqual(box, { origin: [0, 0, 0], size: [8, 8, 8] });
  });
});
