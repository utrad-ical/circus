import { invertPixelValue } from './invertPixelValue';

describe('invertPixelValue', () => {
  test('bitStored = 8, pixelRepresentation = 0', () => {
    expect(invertPixelValue(255, 8, 0)).toBe(0);
    expect(invertPixelValue(0, 8, 0)).toBe(255);
  });
  test('bitStored = 6, pixelRepresentation = 0', () => {
    expect(invertPixelValue(63, 6, 0)).toBe(0);
    expect(invertPixelValue(0, 6, 0)).toBe(63);
  });
  test('bitStored = 8, pixelRepresentation = 1', () => {
    expect(invertPixelValue(0, 8, 1)).toBe(-1);
    expect(invertPixelValue(127, 8, 1)).toBe(-128);
    expect(invertPixelValue(-128, 8, 1)).toBe(127);
  });
  test('bitStored = 6, pixelRepresentation = 1', () => {
    expect(invertPixelValue(0, 6, 1)).toBe(-1);
    expect(invertPixelValue(31, 6, 1)).toBe(-32);
    expect(invertPixelValue(-32, 6, 1)).toBe(31);
  });
});
