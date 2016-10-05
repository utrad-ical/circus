'use strict';

var assert = require('chai').assert;
var ff = require('../lib/browser/util/flood-fill');

describe('floodFill', function() {
	it('should fill a closed area correctly', function() {
		var arr = new ff.BinaryArray2D(5, 5);
		for (let i = 0; i < 5; i++) {
			arr.set(true, [i, 0]);
			arr.set(true, [i, 4]);
			arr.set(true, [0, i]);
			arr.set(true, [4, i]);
		}
		var filled = ff.floodFill(arr, [2, 2]);
		assert.equal(filled, 9);
		assert.equal(arr.toString(), '*****\n'.repeat(5));
	});

	it('should fill a complexed cloed arae', function() {
		function t(start) {
			var arr = new ff.BinaryArray2D(7, 7);
			var pat =
				'*******' +
				'*     *' +
				'* *** *' +
				'* * * *' +
				'* * * *' +
				'* *   *' +
				'* *****';
			for (let i = 0; i < 49; i++) {
				if (pat[i] === '*') arr.set(true, [i % 7, Math.floor(i / 7)]);
			}
			var filled = ff.floodFill(arr, start);
			assert.equal(filled, 18);
			assert.equal(arr.toString(), '*******\n'.repeat(7));
		}
		t([3, 3]);
		t([1, 1]);
		t([1, 5]);
		t([1, 6]);
	});

	it('should fill an empty area correctly', function() {
		var arr = new ff.BinaryArray2D(5, 5);
		var filled = ff.floodFill(arr, [2, 2]);
		assert.equal(filled, 25);
		assert.equal(arr.toString(), '*****\n'.repeat(5));
	});

});