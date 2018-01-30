'use strict';

const su = require('../src/browser/section-util');
const geo = require('../src/common/geometry');
const assert = require('chai').assert;

describe('Section', function() {
  it('#parallelToX', function() {
    assert.isTrue(su.parallelToX([1, 0, 0]));
    assert.isTrue(su.parallelToX([-1, 0, 0]));
    assert.isFalse(su.parallelToX([0, 1, 0]));
    assert.isFalse(su.parallelToX([0, -1, 0]));
    assert.isFalse(su.parallelToX([0, 0, 1]));
    assert.isFalse(su.parallelToX([0, 0, -1]));
    assert.isFalse(su.parallelToX([0.5, 0.5, 0.5]));
  });

  it('#parallelToY', function() {
    assert.isFalse(su.parallelToY([1, 0, 0]));
    assert.isFalse(su.parallelToY([-1, 0, 0]));
    assert.isTrue(su.parallelToY([0, 1, 0]));
    assert.isTrue(su.parallelToY([0, -1, 0]));
    assert.isFalse(su.parallelToY([0, 0, 1]));
    assert.isFalse(su.parallelToY([0, 0, -1]));
    assert.isFalse(su.parallelToY([0.5, 0.5, 0.5]));
  });

  it('#parallelToZ', function() {
    assert.isFalse(su.parallelToZ([1, 0, 0]));
    assert.isFalse(su.parallelToZ([-1, 0, 0]));
    assert.isFalse(su.parallelToZ([0, 1, 0]));
    assert.isFalse(su.parallelToZ([0, -1, 0]));
    assert.isTrue(su.parallelToZ([0, 0, 1]));
    assert.isTrue(su.parallelToZ([0, 0, -1]));
    assert.isFalse(su.parallelToZ([0.5, 0.5, 0.5]));
  });

  it('#detectOrthogonalSection', function() {
    assert.equal(
      su.detectOrthogonalSection({ xAxis: [1, 0, 0], yAxis: [0, 1, 0] }),
      'axial'
    );
    assert.equal(
      su.detectOrthogonalSection({ xAxis: [0, 1, 0], yAxis: [0, 0, 1] }),
      'sagittal'
    );
    assert.equal(
      su.detectOrthogonalSection({ xAxis: [1, 0, 0], yAxis: [0, 0, 1] }),
      'coronal'
    );
    assert.equal(
      su.detectOrthogonalSection({ xAxis: [1, 2, 0], yAxis: [0, 1, 0] }),
      'oblique'
    );
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
      const s = section();
      const t = geo.translateSection(s, [10, 11, 12]);
      assert.deepEqual(t.origin, [11, 14, 17]);
    });
  });
});
