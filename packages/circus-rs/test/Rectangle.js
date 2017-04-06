'use strict';

var geo = require('../lib/common/geometry');
var assert = require('chai').assert;

describe('Rectangle', function() {
	describe('rectangleEquals', function() {
		it('must return true when two rectangles are the same', function() {
			var r1 = { origin: [0, 0], size: [3, 3] };
			var r2 = { origin: [0, 0], size: [3, 3] };
			var r3 = { origin: [0, 1], size: [1, 3] };

			assert.isTrue(geo.rectangleEquals(r1, r2));
			assert.isFalse(geo.rectangleEquals(r1, r3));
		});
	});

	describe('intersectionOfTwoRectangles', function() {
		it('calculates intersection of two rectangles', function() {
			var r1 = { origin: [0, 0], size: [3, 3] };
			var r2 = { origin: [1, 2], size: [4, 4] };
			var r3 = { origin: [1, 1], size: [1, 1] };
			var r4 = { origin: [-1, -1], size: [5, 5] };
			var r5 = { origin: [3, 3], size: [3, 3] };
			var intersect;

			intersect = geo.intersectionOfTwoRectangles(r1, r2);
			assert.deepEqual(intersect, { origin: [1, 2], size: [2, 1] });

			intersect = geo.intersectionOfTwoRectangles(r1, r3);
			assert.deepEqual(intersect, { origin: [1, 1], size: [1, 1] });

			intersect = geo.intersectionOfTwoRectangles(r1, r4);
			assert.deepEqual(intersect, { origin: [0, 0], size: [3, 3] });

			intersect = geo.intersectionOfTwoRectangles(r1, r5);
			assert.deepEqual(intersect, null);
		});
	});
});
