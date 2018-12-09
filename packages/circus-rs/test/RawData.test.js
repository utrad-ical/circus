'use strict';

const rawdata = require('../src/common/RawData');
const px = require('../src/common/PixelFormat');
const RawData = rawdata.default;
const PixelFormat = px.PixelFormat;

const assert = require('chai').assert;

describe('RawData', function() {
  it('must create binary data', function() {
    const raw = new RawData([8, 8, 8], PixelFormat.Binary);
    const array = new Uint8Array(8); // 64 bits in a slice
    array[0] = 0xaa; // 0b10101010
    raw.insertSingleImage(0, array.buffer);
    assert.equal(raw.getPixelAt(0, 0, 0), 1);
    assert.equal(raw.getPixelAt(1, 0, 0), 0);
    assert.equal(raw.getPixelAt(2, 0, 0), 1);
    assert.equal(raw.getPixelAt(3, 0, 0), 0);
  });

  function readWriteTest(pixelFormat, w, h, d) {
    return function() {
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
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          for (let z = 0; z < d; z++) {
            const value = ((x + y + z) % (hi - lo + 1)) + lo;
            const px = raw.getPixelAt(x, y, z);
            assert.equal(px, value);
          }
        }
      }
    };
  }

  it(
    'must read/write values from/to UInt8 volume',
    readWriteTest(PixelFormat.UInt8, 32, 32, 10)
  );

  it(
    'must read/write values from/to Int8 volume',
    readWriteTest(PixelFormat.Int8, 32, 32, 10)
  );

  it(
    'must read/write values from/to UInt16 volume',
    readWriteTest(PixelFormat.UInt16, 32, 32, 10)
  );

  it(
    'must read/write values from/to Int16 volume',
    readWriteTest(PixelFormat.Int16, 32, 32, 10)
  );

  it(
    'must read/write values from/to Binary volume',
    readWriteTest(PixelFormat.Binary, 32, 32, 10)
  );

  it('must perform pixel format converting', function() {
    const raw = new RawData([4, 4, 4], PixelFormat.Int16);
    raw.convert(PixelFormat.Int8, function(v) {
      return v + 5;
    });
    assert.equal(raw.getPixelFormat(), PixelFormat.Int8);
    assert.equal(raw.getPixelAt(2, 2, 2), 5);
  });

  it('must copy data from another instance', function() {
    const src = new RawData([16, 16, 16], PixelFormat.Int8);
    src.fillAll((x, y, z) => x + y + z);
    const dest = new RawData([16, 16, 16], PixelFormat.Int8);
    dest.copy(src);
    assert.equal(dest.getPixelAt(3, 10, 7), 20);

    dest.fillAll(0);
    dest.copy(src, undefined, [3, 3, 3]);
    assert.equal(dest.getPixelAt(6, 13, 10), 20);
    assert.equal(dest.getPixelAt(15, 15, 15), 36);

    dest.fillAll(0);
    dest.copy(src, undefined, [-3, -3, -3]);
    assert.equal(dest.getPixelAt(0, 7, 4), 20);
    assert.equal(dest.getPixelAt(0, 0, 0), 9);

    dest.fillAll(0);
    dest.copy(src, { origin: [5, 5, 5], size: [5, 5, 5] });
    assert.equal(dest.getPixelAt(0, 0, 0), 15);
    assert.equal(dest.getPixelAt(4, 4, 4), 27);
    assert.equal(dest.getPixelAt(5, 4, 4), 0);

    assert.throws(function() {
      dest.copy(dest);
    }, TypeError);
  });

  it('must transform bounding box', function() {
    function newVol() {
      const vol = new RawData([16, 16, 16], PixelFormat.Int8);
      vol.fillAll((x, y, z) => x + y + z);
      return vol;
    }

    // shrink to origin
    {
      const vol = newVol();
      vol.transformBoundingBox({ origin: [0, 0, 0], size: [8, 8, 8] });
      assert.deepEqual(vol.getDimension(), [8, 8, 8]);
      assert.equal(vol.getPixelAt(5, 7, 3), 15);
    }

    // shrink to bottom-right
    {
      const vol = newVol();
      vol.transformBoundingBox({ origin: [8, 8, 8], size: [8, 8, 8] });
      assert.deepEqual(vol.getDimension(), [8, 8, 8]);
      assert.equal(vol.getPixelAt(0, 0, 0), 24);
      assert.equal(vol.getPixelAt(7, 7, 7), 45);
    }

    // expand from origin
    {
      const vol = newVol();
      vol.transformBoundingBox({ origin: [0, 0, 0], size: [24, 24, 24] });
      assert.deepEqual(vol.getDimension(), [24, 24, 24]);
      assert.equal(vol.getPixelAt(5, 7, 3), 15);
      assert.equal(vol.getPixelAt(15, 15, 15), 45);
      assert.equal(vol.getPixelAt(20, 20, 20), 0);
    }

    // expand to top-left
    {
      const vol = newVol();
      vol.transformBoundingBox({ origin: [0, 0, 0], size: [32, 32, 32] }, [
        16,
        16,
        16
      ]);
      assert.deepEqual(vol.getDimension(), [32, 32, 32]);
      assert.equal(vol.getPixelAt(15, 15, 15), 0);
      assert.equal(vol.getPixelAt(16 + 1, 16 + 3, 16 + 5), 9);
    }
  });

  it('must handle partial volume', function() {
    const vol = new RawData([16, 16, 16], PixelFormat.Int8);
    vol.fillAll((x, y, z) => x + y + z);
    vol.setPartialVolumeDescriptor({ start: 2, end: 8, delta: 2 });
    assert.equal(vol.getPixelAt(1, 1, 2), 8);
    vol.setPartialVolumeDescriptor(undefined);
    assert.equal(vol.getPixelAt(1, 1, 1), 3);
  });
});
