"use strict";

var RawData = require('../build/RawData.js').default;

var assert = require('chai').assert;

describe('RawData', function() {
	it('must create binary data', function() {
		var raw = new RawData();
		raw.setDimension(8, 8, 8, 4); // 4 = Binary
		var buf = new Buffer(8 * 8 / 8);
		buf.fill(0xAA); // 0b10101010
		raw.insertSingleImage(0, buf);
		assert.equal(raw.getPixelAt(0, 0, 0), 1);
		assert.equal(raw.getPixelAt(1, 0, 0), 0);
		assert.equal(raw.getPixelAt(2, 0, 0), 1);
		assert.equal(raw.getPixelAt(3, 0, 0), 0);
	});
});