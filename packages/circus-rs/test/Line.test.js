'use strict';

const line = require('../src/common/geometry/Line');
const { Vector2 } = require('three');
const assert = require('chai').assert;

describe('Line', function() {
  describe('intersectsDirectedSegment', function() {
    function test(segment1, segment2, expected) {
      assert.equal(
        line.intersectsDirectedSegment(segment1, segment2),
        expected
      );
      assert.equal(
        line.intersectsDirectedSegment(segment2, segment1),
        expected
      );
    }
    function v2(x, y) {
      return new Vector2(x, y);
    }
    function ds(p1, p2) {
      return { from: p1, to: p2 };
    }

    it('Two line segments do not intersect.', function() {
      test(ds(v2(0, 0), v2(1, 0)), ds(v2(1.001, 0), v2(2, 0)), false);

      it('Return false if two line segments are parallel.', function() {
        test(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(1, 1)), false);
        test(ds(v2(0, 0), v2(0, 1)), ds(v2(1, 0), v2(1, 1)), false);
        test(ds(v2(0, 0), v2(2, 2)), ds(v2(0, 1), v2(2, 3)), false);
        it(': collinear.', function() {
          it(': not overlapping', function() {
            test(ds(v2(0, 0), v2(1, 0)), ds(v2(2, 0), v2(3, 0)), false);
            test(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 2), v2(0, 3)), false);
            test(ds(v2(1, 1), v2(2, 2)), ds(v2(3, 3), v2(4, 4)), false);
          });
          it(': overlapping', function() {
            test(ds(v2(0, 0), v2(1, 0)), ds(v2(0, 0), v2(1, 0)), false);
            test(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 0), v2(0, 1)), false);
            test(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(2, 0)), false);
            test(ds(v2(0, 0), v2(0, 1)), ds(v2(0, 1), v2(0, 2)), false);
            test(ds(v2(0, 0), v2(2, 0)), ds(v2(1, 0), v2(4, 0)), false);
            test(ds(v2(0, 0), v2(0, 2)), ds(v2(0, 1), v2(0, 4)), false);
            test(ds(v2(1, 1), v2(3, 3)), ds(v2(2, 2), v2(4, 4)), false);
          });
        });
      });
      it('Return false if a point is given instead of a line segment.', function() {
        test(ds(v2(0, 0), v2(0, 0)), ds(v2(0, 0), v2(1, 1)), true);
      });
    });
    it('Two line segments intersect.', function() {
      test(ds(v2(0, 0), v2(1, 0)), ds(v2(0, 0), v2(0, 1)), true);
      test(ds(v2(0, 0), v2(-1, 0)), ds(v2(0, 0), v2(0, -1)), true);
      test(ds(v2(0, 0), v2(1, 0)), ds(v2(1, 0), v2(1, 1)), true);
      test(ds(v2(0, 0), v2(1, 0)), ds(v2(1, -1), v2(1, 1)), true);
    });
  });
});
