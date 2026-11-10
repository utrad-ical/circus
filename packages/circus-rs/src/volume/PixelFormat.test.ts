import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PixelFormat, pixelFormatInfo } from './PixelFormat.ts';

test('pixelFormatInfo', () => {
  const result = pixelFormatInfo('int16');
  assert.equal(result.bpp, 2);
});
