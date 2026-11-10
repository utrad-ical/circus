import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { invertPixelValue } from './invertPixelValue.ts';

describe('invertPixelValue', () => {
  test('bitStored = 8, pixelRepresentation = 0', () => {
    assert.equal(invertPixelValue(255, 8, 0), 0);
    assert.equal(invertPixelValue(0, 8, 0), 255);
  });
  test('bitStored = 6, pixelRepresentation = 0', () => {
    assert.equal(invertPixelValue(63, 6, 0), 0);
    assert.equal(invertPixelValue(0, 6, 0), 63);
  });
  test('bitStored = 8, pixelRepresentation = 1', () => {
    assert.equal(invertPixelValue(0, 8, 1), -1);
    assert.equal(invertPixelValue(127, 8, 1), -128);
    assert.equal(invertPixelValue(-128, 8, 1), 127);
  });
  test('bitStored = 6, pixelRepresentation = 1', () => {
    assert.equal(invertPixelValue(0, 6, 1), -1);
    assert.equal(invertPixelValue(31, 6, 1), -32);
    assert.equal(invertPixelValue(-32, 6, 1), 31);
  });
});
