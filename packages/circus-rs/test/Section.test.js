'use strict';

const su = require('../src/browser/section-util');
const geo = require('../src/common/geometry');
const { Vector3 } = require('three');
const assert = require('chai').assert;

describe('Section', function() {
  it('#parallelToX', function() {
    assert.isTrue(su.parallelToX(new Vector3(1, 0, 0)));
    assert.isTrue(su.parallelToX(new Vector3(-1, 0, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, 1, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, -1, 0)));
    assert.isFalse(su.parallelToX(new Vector3(0, 0, 1)));
    assert.isFalse(su.parallelToX(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToX(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#parallelToY', function() {
    assert.isFalse(su.parallelToY(new Vector3(1, 0, 0)));
    assert.isFalse(su.parallelToY(new Vector3(-1, 0, 0)));
    assert.isTrue(su.parallelToY(new Vector3(0, 1, 0)));
    assert.isTrue(su.parallelToY(new Vector3(0, -1, 0)));
    assert.isFalse(su.parallelToY(new Vector3(0, 0, 1)));
    assert.isFalse(su.parallelToY(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToY(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#parallelToZ', function() {
    assert.isFalse(su.parallelToZ(new Vector3(1, 0, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(-1, 0, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(0, 1, 0)));
    assert.isFalse(su.parallelToZ(new Vector3(0, -1, 0)));
    assert.isTrue(su.parallelToZ(new Vector3(0, 0, 1)));
    assert.isTrue(su.parallelToZ(new Vector3(0, 0, -1)));
    assert.isFalse(su.parallelToZ(new Vector3(0.5, 0.5, 0.5)));
  });

  it('#detectOrthogonalSection', function() {
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: new Vector3(1, 0, 0),
        yAxis: new Vector3(0, 1, 0)
      }),
      'axial'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: new Vector3(0, 1, 0),
        yAxis: new Vector3(0, 0, 1)
      }),
      'sagittal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: new Vector3(1, 0, 0),
        yAxis: new Vector3(0, 0, 1)
      }),
      'coronal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: new Vector3(1, 2, 0),
        yAxis: new Vector3(0, 1, 0)
      }),
      'oblique'
    );
  });

  describe('should handle section transformations', function() {
    function section() {
      return {
        origin: new Vector3(1, 3, 5),
        xAxis: new Vector3(2, 5, 9),
        yAxis: new Vector3(8, 8, 10)
      };
    }

    it('#transform', function() {
      const s = section();
      const t = geo.translateSection(s, new Vector3(10, 11, 12));
      assert.deepEqual(t.origin.toArray(), [11, 14, 17]);
    });
  });
});
