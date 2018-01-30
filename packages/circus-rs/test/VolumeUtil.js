'use strict';

const rawdata = require('../src/common/RawData');
const px = require('../src/common/PixelFormat');
const RawData = rawdata.default;
const PixelFormat = px.PixelFormat;

const volUtil = require('../src/browser/volume-util');

const assert = require('chai').assert;

describe('volume-util', function() {
  describe('scanBoundingBox()', function() {
    it('should return null for volume with all zeros', function() {
      const vol = new RawData([8, 8, 8], PixelFormat.Int8);
      const box = volUtil.scanBoundingBox(vol);
      assert.equal(box, null);
    });

    it('should return correct box for volume with some non-zeros', function() {
      const vol = new RawData([8, 8, 8], PixelFormat.Int8);
      vol.writePixelAt(1, 5, 5, 5);
      vol.writePixelAt(1, 5, 6, 7);
      const box = volUtil.scanBoundingBox(vol);
      assert.deepEqual(box, { origin: [5, 5, 5], size: [1, 2, 3] });
    });

    it('should snap x-size to the multiple of 8', function() {
      const vol = new RawData([8, 8, 8], PixelFormat.Binary);
      vol.writePixelAt(1, 5, 5, 5);
      vol.writePixelAt(1, 5, 6, 7);
      const box = volUtil.scanBoundingBox(vol, true); // snap
      assert.deepEqual(box, { origin: [5, 5, 5], size: [8, 2, 3] });
    });

    it('should return correct box for volume with all non-zeros', function() {
      const vol = new RawData([8, 8, 8], PixelFormat.Int8);
      vol.fillAll(1);
      const box = volUtil.scanBoundingBox(vol);
      assert.deepEqual(box, { origin: [0, 0, 0], size: [8, 8, 8] });
    });
  });
});
