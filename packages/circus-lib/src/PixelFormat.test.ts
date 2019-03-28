import { PixelFormat, pixelFormatInfo } from './PixelFormat';

test('pixelFormatInfo', () => {
  const result = pixelFormatInfo(PixelFormat.Int16);
  expect(result.bpp).toBe(2);
});
