'use strict';

var assert = require('chai').assert;
var ff = require('../src/browser/util/flood-fill');

describe('floodFill', function() {
	function t(pattern, start, expectedPattern, expectedFillCount) {
		var rows = pattern.replace(/\n$/, '').split(/\n/);
		var width = Math.max.apply(Math, rows.map(r => r.length));
		var arr = new ff.BinaryArray2D(width, rows.length);
		for (var y = 0; y < rows.length; y++) {
			for (var x = 0; x < width; x++) {
				if (rows[y][x] === '*') arr.set(true, [x, y]);
			}
		}
		var filled = ff.floodFill(arr, start);
		assert.equal(arr.toString(), expectedPattern);
		assert.equal(filled, expectedFillCount);
	}


	it('must flood-fill a closed area correctly', function() {
		var pat = '*****\n' + '*   *\n'.repeat(3) + '*****';
		t(pat, [3, 3], '*****\n'.repeat(5), 9);
	});


	it('must flood-fill a complexed cloed area', function() {
		var pat =
			'*******\n' +
			'*     *\n' +
			'* *** *\n' +
			'* * * *\n' +
			'* * * *\n' +
			'* *   *\n' +
			'* *****';
		t(pat, [3, 3], '*******\n'.repeat(7), 18);
		t(pat, [1, 1], '*******\n'.repeat(7), 18);
		t(pat, [1, 5], '*******\n'.repeat(7), 18);
		t(pat, [1, 6], '*******\n'.repeat(7), 18);
	});


	it('must flood-fill a ring-like closed area', function() {
		var pat =
			'********\n' +
			'*      *\n' +
			'* **** *\n' +
			'* *  * *\n' +
			'* **** *\n' +
			'*      *\n' +
			'********\n';
		var outFilled =
			'********\n' +
			'********\n' +
			'********\n' +
			'***  ***\n' +
			'********\n' +
			'********\n' +
			'********\n';
		var inFilled =
			'********\n' +
			'*      *\n' +
			'* **** *\n' +
			'* **** *\n' +
			'* **** *\n' +
			'*      *\n' +
			'********\n';

		t(pat, [3, 3], inFilled, 2);
		t(pat, [1, 1], outFilled, 18);
		t(pat, [3, 1], outFilled, 18);
	});


	it('must flood-fill an empty area', function() {
		var blank = '     \n'.repeat(5);
		t(blank, [3, 3], '*****\n'.repeat(5), 25);
	});

});