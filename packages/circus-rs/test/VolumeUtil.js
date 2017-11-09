'use strict';

var rawdata = require('../src/common/RawData');
var px = require('../src/common/PixelFormat');
var RawData = rawdata.default;
var PixelFormat = px.PixelFormat;

var volUtil = require('../src/browser/volume-util');

var assert = require('chai').assert;

describe('volume-util', function() {

	describe('scanBoundingBox()', function() {

		it('should return null for volume with all zeros', function() {
			var vol = new RawData([8, 8, 8], PixelFormat.Int8);
			var box = volUtil.scanBoundingBox(vol);
			assert.equal(box, null);
		});

		it('should return correct box for volume with some non-zeros', function() {
			var vol = new RawData([8 ,8, 8], PixelFormat.Int8);
			vol.writePixelAt(1, 5, 5, 5);
			vol.writePixelAt(1, 5, 6, 7);
			var box = volUtil.scanBoundingBox(vol);
			assert.deepEqual(box, { origin: [5, 5, 5], size: [1, 2, 3] });
		});

		it('should snap x-size to the multiple of 8', function() {
			var vol = new RawData([8, 8, 8], PixelFormat.Binary);
			vol.writePixelAt(1, 5, 5, 5);
			vol.writePixelAt(1, 5, 6, 7);
			var box = volUtil.scanBoundingBox(vol, true); // snap
			assert.deepEqual(box, { origin: [5, 5, 5], size: [8, 2, 3] });
		});

		it('should return correct box for volume with all non-zeros', function() {
			var vol = new RawData([8, 8, 8], PixelFormat.Int8);
			vol.fillAll(1);
			var box = volUtil.scanBoundingBox(vol);
			assert.deepEqual(box, { origin: [0, 0, 0], size: [8, 8, 8] });
		});

	});

});
