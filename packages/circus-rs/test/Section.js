'use strict';

var vs = require('../lib/browser/section');
var assert = require('chai').assert;

describe('Section', function() {
	it('#parallelToX', function() {
		assert.isTrue(vs.parallelToX([1, 0, 0]));
		assert.isTrue(vs.parallelToX([-1, 0, 0]));
		assert.isFalse(vs.parallelToX([0, 1, 0]));
		assert.isFalse(vs.parallelToX([0, -1, 0]));
		assert.isFalse(vs.parallelToX([0, 0, 1]));
		assert.isFalse(vs.parallelToX([0, 0, -1]));
		assert.isFalse(vs.parallelToX([0.5, 0.5, 0.5]));
	});

	it('#parallelToY', function() {
		assert.isFalse(vs.parallelToY([1, 0, 0]));
		assert.isFalse(vs.parallelToY([-1, 0, 0]));
		assert.isTrue(vs.parallelToY([0, 1, 0]));
		assert.isTrue(vs.parallelToY([0, -1, 0]));
		assert.isFalse(vs.parallelToY([0, 0, 1]));
		assert.isFalse(vs.parallelToY([0, 0, -1]));
		assert.isFalse(vs.parallelToY([0.5, 0.5, 0.5]));
	});

	it('#parallelToZ', function() {
		assert.isFalse(vs.parallelToZ([1, 0, 0]));
		assert.isFalse(vs.parallelToZ([-1, 0, 0]));
		assert.isFalse(vs.parallelToZ([0, 1, 0]));
		assert.isFalse(vs.parallelToZ([0, -1, 0]));
		assert.isTrue(vs.parallelToZ([0, 0, 1]));
		assert.isTrue(vs.parallelToZ([0, 0, -1]));
		assert.isFalse(vs.parallelToZ([0.5, 0.5, 0.5]));
	});

	it('#detectOrthogonalSection', function() {
		assert.equal(vs.detectOrthogonalSection({ xAxis: [1, 0, 0], yAxis: [0, 1, 0] }), 'axial');
		assert.equal(vs.detectOrthogonalSection({ xAxis: [0, 1, 0], yAxis: [0, 0, 1] }), 'sagittal');
		assert.equal(vs.detectOrthogonalSection({ xAxis: [1, 0, 0], yAxis: [0, 0, 1] }), 'coronal');
		assert.equal(vs.detectOrthogonalSection({ xAxis: [1, 2, 0], yAxis: [0, 1, 0] }), 'oblique');
	});

	describe('should handle section transformations', function() {
		function section() {
			return {
				origin: [1, 3, 5],
				xAxis: [2, 5, 9],
				yAxis: [8, 8, 10]
			};
		}

		it('#transform', function() {
			var s = section();
			var t = vs.translateSection(s, [10, 11, 12]);
			assert.deepEqual(t.origin, [11, 14, 17]);
		});
	});
});
