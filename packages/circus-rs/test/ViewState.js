'use strict';

var vs = require('../lib/browser/view-state');
var assert = require('chai').assert;

describe('ViewState', function() {
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
});
