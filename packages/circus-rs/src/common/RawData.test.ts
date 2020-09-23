import RawData from './RawData';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import { Vector3D } from './geometry';

test('create binary data', () => {
  const raw = new RawData([8, 8, 8], 'binary');
  const array = new Uint8Array(8); // 64 bits in a slice
  array[0] = 0xaa; // 0b10101010
  raw.insertSingleImage(0, array.buffer);
  expect(raw.getPixelAt(0, 0, 0)).toBe(1);
  expect(raw.getPixelAt(1, 0, 0)).toBe(0);
  expect(raw.getPixelAt(2, 0, 0)).toBe(1);
  expect(raw.getPixelAt(3, 0, 0)).toBe(0);
});

describe('create binary data (various sizes)', () => {
  const createBuffer = (binary: string) => {
    const value: any[] = [...binary];
    const data = value.reduce(
      (prev, cur, i) =>
        i % 8 ? prev : [...prev, parseInt(value.slice(i, i + 8).join(''), 2)],
      []
    );
    return new Uint8Array(data).buffer;
  };

  const checkPixelAtFull = (
    size: Vector3D,
    raw: RawData,
    value: number | ((x: number, y: number, z: number) => number)
  ) => {
    const [rx, ry, rz] = size;
    for (let z = 0; z < rz; z++) {
      for (let y = 0; y < ry; y++) {
        for (let x = 0; x < rx; x++) {
          if (typeof value === 'number') {
            expect(raw.getPixelAt(x, y, z)).toBe(value);
          } else {
            expect(raw.getPixelAt(x, y, z)).toBe(value(x, y, z));
          }
        }
      }
    }
  };

  const checkPixelAtZ = (
    size: Vector3D,
    raw: RawData,
    value: number | ((x: number, y: number, z: number) => number),
    z: number
  ) => {
    const [rx, ry, rz] = size;
    for (let y = 0; y < ry; y++) {
      for (let x = 0; x < rx; x++) {
        if (typeof value === 'number') {
          expect(raw.getPixelAt(x, y, z)).toBe(value);
        } else {
          expect(raw.getPixelAt(x, y, z)).toBe(value(x, y, z));
        }
      }
    }
  };

  const checkSingleImage = (
    actualData: ArrayBuffer,
    expectData: ArrayBuffer
  ) => {
    const actualSrc = new Uint8Array(actualData);
    const expectSrc = new Uint8Array(expectData);
    actualSrc.forEach((value, idx) => {
      expect(value).toEqual(expectSrc[idx]);
    });
  };

  test('not affect other images with different depths', () => {
    for (let i = 3; i < 16; i++) {
      const size: Vector3D = [i, i, i];
      const [rx, ry, rz] = size;
      const bits = rx * ry; // bits in a slice
      const bytes = Math.ceil(bits / 8);

      const fullData = (() => {
        return createBuffer(''.padEnd(bits, '1').padEnd(bytes * 8, '0'));
      })();

      const emptyData = (() => {
        return createBuffer(''.padEnd(bits, '0').padEnd(bytes * 8, '0'));
      })();

      for (let z = 0; z < rz; z++) {
        const raw = new RawData(size, 'binary');

        const check = (
          exec: () => void,
          expect: {
            current: ArrayBuffer;
            prev: ArrayBuffer;
            next: ArrayBuffer;
            valuePixelAt:
              | number
              | ((x: number, y: number, z: number) => number);
          }
        ) => {
          exec();
          checkSingleImage(raw.getSingleImage(z), expect.current);
          checkPixelAtZ(size, raw, expect.valuePixelAt, z);

          if (z > 0) {
            checkSingleImage(raw.getSingleImage(z - 1), expect.prev);
            checkPixelAtZ(size, raw, expect.valuePixelAt, z - 1);
          }

          if (z < rz - 1) {
            checkSingleImage(raw.getSingleImage(z + 1), expect.next);
            checkPixelAtZ(size, raw, expect.valuePixelAt, z + 1);
          }
        };

        check(
          () => {
            raw.fillAll(1);
          },
          {
            current: fullData,
            prev: fullData,
            next: fullData,
            valuePixelAt: 1
          }
        );

        check(
          () => {
            raw.clearSingleImage(z);
          },
          {
            current: emptyData,
            prev: fullData,
            next: fullData,
            valuePixelAt: (px: number, py: number, pz: number) => {
              return pz === z ? 0 : 1;
            }
          }
        );

        check(
          () => {
            raw.insertSingleImage(z, fullData);
          },
          {
            current: fullData,
            prev: fullData,
            next: fullData,
            valuePixelAt: 1
          }
        );

        check(
          () => {
            raw.fillAll(0);
          },
          {
            current: emptyData,
            prev: emptyData,
            next: emptyData,
            valuePixelAt: 0
          }
        );

        check(
          () => {
            raw.insertSingleImage(z, fullData);
          },
          {
            current: fullData,
            prev: emptyData,
            next: emptyData,
            valuePixelAt: (px: number, py: number, pz: number) => {
              return pz === z ? 1 : 0;
            }
          }
        );
      }
    }
  });

  test('shift bits correctly', () => {
    const size: Vector3D = [6, 6, 6];
    const raw = new RawData(size, 'binary');

    const [rx, ry, rz] = size;
    const bits = rx * ry; // bits in a slice
    const bytes = Math.ceil(bits / 8);

    const slices = new Array(
      ''.padEnd(bits, '100001'),
      ''.padEnd(bits, '110011'),
      ''.padEnd(bits, '101010'),
      ''.padEnd(bits, '010101'),
      ''.padEnd(bits, '101101'),
      ''.padEnd(bits, '011110')
    );

    const pixelValue = (px: number, py: number, pz: number) => {
      if (pz === 0) {
        return px === 0 || px === 5 ? 1 : 0;
      } else if (pz === 1) {
        return px === 2 || px === 3 ? 0 : 1;
      } else if (pz === 2) {
        return px % 2 === 0 ? 1 : 0;
      } else if (pz === 3) {
        return px % 2 === 0 ? 0 : 1;
      } else if (pz === 4) {
        return px === 1 || px === 4 ? 0 : 1;
      } else {
        return px === 0 || px === 5 ? 0 : 1;
      }
    };

    const slice = (i: number) => {
      return createBuffer(slices[i].padEnd(bytes * 8, '0'));
    };

    raw.fillAll(0);
    for (let z = 0; z < rz; z++) {
      const expect = slice(z);
      raw.insertSingleImage(z, expect);
    }

    for (let z = 0; z < rz; z++) {
      const expect = slice(z);
      const actual = raw.getSingleImage(z);
      checkSingleImage(actual, expect);
      checkPixelAtFull(size, raw, pixelValue);
    }
  });
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
  test('UInt8 volume', readWriteTest('uint8', 32, 32, 10));
  test('Int8 volume', readWriteTest('int8', 32, 32, 10));
  test('UInt16 volume', readWriteTest('uint16', 32, 32, 10));
  test('Int16 volume', readWriteTest('int16', 32, 32, 10));
  test('Binary volume', readWriteTest('binary', 32, 32, 10));
});

test('#convert', () => {
  const raw = new RawData([4, 4, 4], 'int16');
  raw.convert('int8', function (v) {
    return v + 5;
  });
  expect(raw.getPixelFormat()).toBe('int8');
  expect(raw.getPixelAt(2, 2, 2)).toBe(5);
});

test('#copy', () => {
  const src = new RawData([16, 16, 16], 'int8');
  src.fillAll((x, y, z) => x + y + z);
  const dest = new RawData([16, 16, 16], 'int8');
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
    const vol = new RawData([16, 16, 16], 'int8');
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
  const vol = new RawData([16, 16, 16], 'int8');
  vol.fillAll((x, y, z) => x + y + z);
  vol.setPartialVolumeDescriptor({ start: 2, end: 8, delta: 2 });
  expect(vol.getPixelAt(1, 1, 2)).toBe(8);
  vol.setPartialVolumeDescriptor(undefined);
  expect(vol.getPixelAt(1, 1, 1)).toBe(3);
});
