import RawData from './RawData';
import { PixelFormat } from './PixelFormat';

test('create binary data', () => {
  const raw = new RawData([8, 8, 8], PixelFormat.Binary);
  const array = new Uint8Array(8); // 64 bits in a slice
  array[0] = 0xaa; // 0b10101010
  raw.insertSingleImage(0, array.buffer);
  expect(raw.getPixelAt(0, 0, 0)).toBe(1);
  expect(raw.getPixelAt(1, 0, 0)).toBe(0);
  expect(raw.getPixelAt(2, 0, 0)).toBe(1);
  expect(raw.getPixelAt(3, 0, 0)).toBe(0);
});

const readWriteTest = (
  pixelFormat: PixelFormat,
  w: number,
  h: number,
  d: number
) => {
  return () => {
    const raw = new RawData([w, h, d], pixelFormat);
    const pi = raw.getPixelFormatInfo(pixelFormat);
    const lo = pi.minLevel;
    const hi = pi.maxLevel;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        for (let z = 0; z < d; z++) {
          const value = ((x + y + z) % (hi - lo + 1)) + lo;
          raw.writePixelAt(value, x, y, z);
        }
      }
    }
    let flag = false;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        for (let z = 0; z < d; z++) {
          const value = ((x + y + z) % (hi - lo + 1)) + lo;
          const px = raw.getPixelAt(x, y, z);
          if (px !== value) flag = true;
        }
      }
    }
    expect(flag).toBe(false);
  };
};

describe('basic read/write', () => {
  test('UInt8 volume', readWriteTest(PixelFormat.UInt8, 32, 32, 10));
  test('Int8 volume', readWriteTest(PixelFormat.Int8, 32, 32, 10));
  test('UInt16 volume', readWriteTest(PixelFormat.UInt16, 32, 32, 10));
  test('Int16 volume', readWriteTest(PixelFormat.Int16, 32, 32, 10));
  test('Binary volume', readWriteTest(PixelFormat.Binary, 32, 32, 10));
});

test('#convert', () => {
  const raw = new RawData([4, 4, 4], PixelFormat.Int16);
  raw.convert(PixelFormat.Int8, function (v) {
    return v + 5;
  });
  expect(raw.getPixelFormat()).toBe(PixelFormat.Int8);
  expect(raw.getPixelAt(2, 2, 2)).toBe(5);
});

test('#copy', () => {
  const src = new RawData([16, 16, 16], PixelFormat.Int8);
  src.fillAll((x, y, z) => x + y + z);
  const dest = new RawData([16, 16, 16], PixelFormat.Int8);
  dest.copy(src);
  expect(dest.getPixelAt(3, 10, 7)).toBe(20);

  dest.fillAll(0);
  dest.copy(src, undefined, [3, 3, 3]);
  expect(dest.getPixelAt(6, 13, 10)).toBe(20);
  expect(dest.getPixelAt(15, 15, 15)).toBe(36);

  dest.fillAll(0);
  dest.copy(src, undefined, [-3, -3, -3]);
  expect(dest.getPixelAt(0, 7, 4)).toBe(20);
  expect(dest.getPixelAt(0, 0, 0)).toBe(9);

  dest.fillAll(0);
  dest.copy(src, { origin: [5, 5, 5], size: [5, 5, 5] });
  expect(dest.getPixelAt(0, 0, 0)).toBe(15);
  expect(dest.getPixelAt(4, 4, 4)).toBe(27);
  expect(dest.getPixelAt(5, 4, 4)).toBe(0);

  expect(() => dest.copy(dest)).toThrow(TypeError);
});

test('#transformBoundingBox', () => {
  const newVol = () => {
    const vol = new RawData([16, 16, 16], PixelFormat.Int8);
    vol.fillAll((x, y, z) => x + y + z);
    return vol;
  };

  // shrink to origin
  {
    const vol = newVol();
    vol.transformBoundingBox({ origin: [0, 0, 0], size: [8, 8, 8] });
    expect(vol.getDimension()).toEqual([8, 8, 8]);
    expect(vol.getPixelAt(5, 7, 3)).toBe(15);
  }

  // shrink to bottom-right
  {
    const vol = newVol();
    vol.transformBoundingBox({ origin: [8, 8, 8], size: [8, 8, 8] });
    expect(vol.getDimension()).toEqual([8, 8, 8]);
    expect(vol.getPixelAt(0, 0, 0)).toBe(24);
    expect(vol.getPixelAt(7, 7, 7)).toBe(45);
  }

  // expand from origin
  {
    const vol = newVol();
    vol.transformBoundingBox({ origin: [0, 0, 0], size: [24, 24, 24] });
    expect(vol.getDimension()).toEqual([24, 24, 24]);
    expect(vol.getPixelAt(5, 7, 3)).toBe(15);
    expect(vol.getPixelAt(15, 15, 15)).toBe(45);
    expect(vol.getPixelAt(20, 20, 20)).toBe(0);
  }

  // expand to top-left
  {
    const vol = newVol();
    vol.transformBoundingBox({ origin: [0, 0, 0], size: [32, 32, 32] }, [
      16,
      16,
      16
    ]);
    expect(vol.getDimension()).toEqual([32, 32, 32]);
    expect(vol.getPixelAt(15, 15, 15)).toBe(0);
    expect(vol.getPixelAt(16 + 1, 16 + 3, 16 + 5)).toBe(9);
  }
});

test('#setPartialVolumeDescriptor', () => {
  const vol = new RawData([16, 16, 16], PixelFormat.Int8);
  vol.fillAll((x, y, z) => x + y + z);
  vol.setPartialVolumeDescriptor({ start: 2, end: 8, delta: 2 });
  expect(vol.getPixelAt(1, 1, 2)).toBe(8);
  vol.setPartialVolumeDescriptor(undefined);
  expect(vol.getPixelAt(1, 1, 1)).toBe(3);
});
