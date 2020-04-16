'use strict';

const line = require('../src/common/geometry/Line');
const { Vector2 } = require('three');
const assert = require('chai').assert;

describe('Line', function() {
  describe('intersectsDirectedSegment', function() {
    const t = (segment1, segment2, expected) => {
      assert.equal(
        line.intersectsDirectedSegment(segment1, segment2),
        expected
      );
      assert.equal(
        line.intersectsDirectedSegment(segment2, segment1),
        expected
      );
    };
    const v2 = (x, y) => new Vector2(x, y);
    const ds = (p1, p2) => ({ from: p1, to: p2 });

    it('two line segments do not intersect', () => {
      t(ds(v2(0, 0), v2(1, 0)), ds(v2(1.001, 0), v2(2, 0)), false);

      it('Return false if two line segments are parallel.', function() {
        t(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(1, 1)), false);
        t(ds(v2(0, 0), v2(0, 1)), ds(v2(1, 0), v2(1, 1)), false);
        t(ds(v2(0, 0), v2(2, 2)), ds(v2(0, 1), v2(2, 3)), false);
        it(': collinear.', () => {
          it(': not overlapping', () => {
            t(ds(v2(0, 0), v2(1, 0)), ds(v2(2, 0), v2(3, 0)), false);
            t(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 2), v2(0, 3)), false);
            t(ds(v2(1, 1), v2(2, 2)), ds(v2(3, 3), v2(4, 4)), false);
          });
          it(': overlapping', () => {
            t(ds(v2(0, 0), v2(1, 0)), ds(v2(0, 0), v2(1, 0)), false);
            t(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 0), v2(0, 1)), false);
            t(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(2, 0)), false);
            t(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 1), v2(0, 2)), false);
            t(ds(v2(0, 0), v2(2, 0)), ds(v2(1, 0), v2(4, 0)), false);
            t(ds(v2(0, 0), v2(0, 2)), ds(v2(0, 1), v2(0, 4)), false);
            t(ds(v2(1, 1), v2(3, 3)), ds(v2(2, 2), v2(4, 4)), false);
          });
        });
      });
      it('Return false if a point is given instead of a line segment.', function() {
        t(ds(v2(0, 0), v2(0, 0)), ds(v2(0, 0), v2(1, 1)), true);
      });
    });
    describe('two line segments intersect', () => {
      t(ds(v2(0, 0), v2(1, 0)), ds(v2(0, 0), v2(0, 1)), true);
      t(ds(v2(0, 0), v2(-1, 0)), ds(v2(0, 0), v2(0, -1)), true);
      t(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(1, 1)), true);
      t(ds(v2(0, 0), v2(1, 0)), ds(v2(1, -1), v2(1, 1)), true);
    });
  });
});
