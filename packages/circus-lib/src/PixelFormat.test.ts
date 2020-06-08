import { PixelFormat, pixelFormatInfo } from './PixelFormat';

test('pixelFormatInfo', () => {
  const result = pixelFormatInfo('int16');
  expect(result.bpp).toBe(2);
});
