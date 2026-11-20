import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import RawData from '../common/RawData.ts';
import * as vu from './volume-util.ts';

describe('scanBoundingBox', () => {
  test('returns null for an all-zero volume', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    const box = vu.scanBoundingBox(vol);
    assert.equal(box, null);
  });

  test('bounds the nonzero voxels', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    vol.writePixelAt(1, 5, 5, 5);
    vol.writePixelAt(1, 5, 6, 7);
    const box = vu.scanBoundingBox(vol);
    assert.deepEqual(box, { origin: [5, 5, 5], size: [1, 2, 3] });
  });

  test('snaps the bounding box width to a multiple of eight', () => {
    const vol = new RawData([8, 8, 8], 'binary');
    vol.writePixelAt(1, 5, 5, 5);
    vol.writePixelAt(1, 5, 6, 7);
    const box = vu.scanBoundingBox(vol, true); // snap
    assert.deepEqual(box, { origin: [5, 5, 5], size: [8, 2, 3] });
  });

  test('returns the full bounding box for an all-nonzero volume', () => {
    const vol = new RawData([8, 8, 8], 'int8');
    vol.fillAll(1);
    const box = vu.scanBoundingBox(vol);
    assert.deepEqual(box, { origin: [0, 0, 0], size: [8, 8, 8] });
  });
});
