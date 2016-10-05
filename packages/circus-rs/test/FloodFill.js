'use strict';

var assert = require('chai').assert;
var ff = require('../lib/browser/util/flood-fill');

describe('floodFill', function() {
	it('should fill a closed area correctly', function() {
		var arr = new ff.BinaryArray2D(5, 5);
		for (let x = 0; x < 5; x++) {
			arr.set(true, [x, 0]);
			arr.set(true, [x, 4]);
		}
		for (let y = 0; y < 5; y++) {
			arr.set(true, [0, y]);
			arr.set(true, [4, y]);
		}
		var filled = ff.floodFill(arr, [2, 2]);
		assert.equal(filled, 9);
		assert.equal(arr.toString(), '*****\n'.repeat(5));
	});

	it('should fill an empty area correctly', function() {
		var arr = new ff.BinaryArray2D(5, 5);
		var filled = ff.floodFill(arr, [2, 2]);
		assert.equal(filled, 25);
		assert.equal(arr.toString(), '*****\n'.repeat(5));
	});

});