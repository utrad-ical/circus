'use strict';

const polygon = require('../src/common/geometry/Polygon');
const { Vector2 } = require('three');
const assert = require('chai').assert;

describe('Polygon', function() {
  describe('intersectsPolygon', function() {
    function test(polygon1, polygon2, expected) {
      assert.equal(polygon.intersectsPolygon(polygon1, polygon2), expected);
      assert.equal(polygon.intersectsPolygon(polygon2, polygon1), expected);
    }
    function v2(x, y) {
      return new Vector2(x, y);
    }
    it('No overlap between the two polygons.', function() {
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(-10, -10), v2(-10, -20), v2(-20, -20), v2(-20, -10)],
        false
      );
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(-0.1, 0), v2(0, -10), v2(-10, -10), v2(-10, 0)],
        false
      );
    });
    it('The sides of the two polygons intersect.', function() {
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(0, 0), v2(0, -10), v2(-10, -10), v2(-10, 0)],
        true
      );
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(5, 5), v2(15, 10), v2(15, 0)],
        true
      );
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(10, 0), v2(10, 10), v2(20, 0)],
        true
      );
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(10, 5), v2(10, 15), v2(20, 5)],
        true
      );
    });
    it('The vertex of one polygon is inside the other polygon.', function() {
      test(
        [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
        [v2(1, 5), v2(3, 9), v2(5, 9), v2(9, 5), v2(4, 1), v2(2, 2)],
        true
      );
      test(
        [v2(1, 5), v2(3, 9), v2(5, 9), v2(9, 5), v2(4, 1), v2(2, 2)],
        [v2(2, 6), v2(4, 8), v2(6, 6), v2(4, 2)],
        true
      );
    });
  });
});
