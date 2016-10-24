"use strict";

var rawdata = require('../lib/common/RawData.js');
var px = require('../lib/common/PixelFormat.js');
var RawData = rawdata.default;
var PixelFormat = px.PixelFormat;

var assert = require('chai').assert;

describe('RawData', function () {
	it('must create binary data', function () {
		var raw = new RawData();
		raw.setDimension(8, 8, 8, PixelFormat.Binary);
		var array = new Uint8Array(8); // 64 bits in a slice
		array[0] = 0xAA; // 0b10101010
		raw.insertSingleImage(0, array.buffer);
		assert.equal(raw.getPixelAt(0, 0, 0), 1);
		assert.equal(raw.getPixelAt(1, 0, 0), 0);
		assert.equal(raw.getPixelAt(2, 0, 0), 1);
		assert.equal(raw.getPixelAt(3, 0, 0), 0);
	});

	function readWriteTest(pixelFormat, w, h, d) {
		return function () {
			var raw = new RawData();
			raw.setDimension(w, h, d, pixelFormat);
			var pi = raw.getPixelFormatInfo(pixelFormat);
			var lo = pi.minLevel;
			var hi = pi.maxLevel;
			for (var x = 0; x < w; x++) {
				for (var y = 0; y < h; y++) {
					for (var z = 0; z < d; z++) {
						var value = (x + y + z) % (hi - lo + 1) + lo;
						raw.writePixelAt(value, x, y, z);
					}
				}
			}
			for (var x = 0; x < w; x++) {
				for (var y = 0; y < h; y++) {
					for (var z = 0; z < d; z++) {
						var value = (x + y + z) % (hi - lo + 1) + lo;
						var px = raw.getPixelAt(x, y, z);
						assert.equal(px, value);
					}
				}
			}
		}
	}

	it('must read/write values from/to UInt8 volume',
		readWriteTest(PixelFormat.UInt8, 32, 32, 10));

	it('must read/write values from/to Int8 volume',
		readWriteTest(PixelFormat.Int8, 32, 32, 10));

	it('must read/write values from/to UInt16 volume',
		readWriteTest(PixelFormat.UInt16, 32, 32, 10));

	it('must read/write values from/to Int16 volume',
		readWriteTest(PixelFormat.Int16, 32, 32, 10));

	it('must read/write values from/to Binary volume',
		readWriteTest(PixelFormat.Binary, 32, 32, 10));

	it('must perform pixel format converting', function() {
		var raw = new RawData();
		raw.setDimension(4, 4, 4, PixelFormat.Int16);
		raw.convert(PixelFormat.Int8, function(v) { return v + 5; });
		assert.equal(raw.getPixelFormat(), PixelFormat.Int8);
		assert.equal(raw.getPixelAt(2, 2, 2), 5);
	});

	it('must copy data from another instance', function() {
		var src = new RawData();
		src.setDimension(16, 16, 16, PixelFormat.Int8);
		src.fillAll((x, y, z) => x + y + z);
		var dest = new RawData();
		dest.setDimension(16, 16, 16, PixelFormat.Int8);
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
		dest.copy(src, { origin: [5, 5, 5], size: [5, 5, 5]});
		assert.equal(dest.getPixelAt(0, 0, 0), 15);
		assert.equal(dest.getPixelAt(4, 4, 4), 27);
		assert.equal(dest.getPixelAt(5, 4, 4), 0);

		assert.throws(function() { dest.copy(dest); }, TypeError);
	});

	it('must transform bounding box', function() {

		function newVol() {
			var vol = new RawData();
			vol.setDimension(16, 16, 16, PixelFormat.Int8);
			vol.fillAll((x, y, z) => x + y + z);
			return vol;
		}

		// shrink
		var vol = newVol();
		vol.transformBoundingBox({ origin: [0, 0, 0], size: [8, 8, 8] });
		assert.deepEqual(vol.getDimension(), [8, 8, 8]);
		assert.equal(vol.getPixelAt(5, 7, 3), 15);

		// expand
		var vol = newVol();
		vol.transformBoundingBox({ origin: [0, 0, 0], size: [24, 24, 24] });
		assert.deepEqual(vol.getDimension(), [24, 24, 24]);
		assert.equal(vol.getPixelAt(5, 7, 3), 15);
		assert.equal(vol.getPixelAt(15, 15, 15), 45);
		assert.equal(vol.getPixelAt(20, 20, 20), 0);

		// expand to left
		var vol = newVol();
		vol.transformBoundingBox({ origin: [0, 0, 0], size: [32, 32, 32] }, [16, 16, 16]);
		assert.deepEqual(vol.getDimension(), [32, 32, 32]);
		assert.equal(vol.getPixelAt(15, 15, 15), 0);
		assert.equal(vol.getPixelAt(16 + 1, 16 + 3, 16 + 5), 9);

	});

});
