'use strict';

const su = require('../src/browser/section-util');
const geo = require('../src/common/geometry');
const { Vector3, Vector2, Box3, Line3 } = require('three');
const assert = require('chai').assert;
const box = require('../src/common/geometry/Box');

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
        xAxis: [1, 0, 0],
        yAxis: [0, 1, 0]
      }),
      'axial'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [0, 1, 0],
        yAxis: [0, 0, 1]
      }),
      'sagittal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [1, 0, 0],
        yAxis: [0, 0, 1]
      }),
      'coronal'
    );
    assert.equal(
      su.detectOrthogonalSection({
        xAxis: [1, 2, 0],
        yAxis: [0, 1, 0]
      }),
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
      const t = geo.translateSection(s, new Vector3(10, 11, 12));
      assert.deepEqual(t.origin, [11, 14, 17]);
    });
  });

  describe('adjustOnResized', function() {
    it('#axial', function() {
      const oldSection = {
        origin: [0, 0, 0],
        xAxis: [6, 0, 0],
        yAxis: [0, 6, 0]
      };
      const beforeResolution = [6, 6];
      const afterResolution = [12, 12];

      const newSection = su.adjustOnResized(
        oldSection,
        beforeResolution,
        afterResolution
      );
      assert.deepEqual(newSection, {
        origin: [-3, -3, 0],
        xAxis: [12, 0, 0],
        yAxis: [0, 12, 0]
      });
    });
    it('#smaller', function() {
      const oldSection = {
        origin: [3, 4, 0],
        xAxis: [0, 16, 12], // length: 20
        yAxis: [0, -12, 16] // length: 20
        // center is [6, 14]
        // origin to center is [0, 2, 14]
      };
      const beforeResolution = [20, 20];
      const afterResolution = [10, 10];

      const newSection = su.adjustOnResized(
        oldSection,
        beforeResolution,
        afterResolution
      );
      assert.deepEqual(newSection, {
        origin: [3, 5, 7], // origin + (origin to center) / 2
        xAxis: [0, 8, 6], // half of before
        yAxis: [0, -6, 8] // half of before
      });
    });
  });

  it('#sectionEquals', function() {
    const a = {
      origin: [0, 0, 1],
      xAxis: [1, 1, 1],
      yAxis: [2, 2, 2]
    };
    assert.isTrue(geo.sectionEquals(a, a));
    assert.isFalse(geo.sectionEquals(a, { ...a, origin: [0, 1, 1] }));
  });

  describe.skip('sectionOverlapsVolume', function() {});
});
