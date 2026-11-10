import { test } from 'node:test';
import { expect } from 'expect';
import { PixelFormat, pixelFormatInfo } from './PixelFormat.ts';

test('pixelFormatInfo', () => {
  const result = pixelFormatInfo('int16');
  expect(result.bpp).toBe(2);
});
