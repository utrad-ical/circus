'use strict';

const geo = require('../src/common/geometry');
const assert = require('chai').assert;
const { Vector2, Box2 } = require('three');

describe('Rectangle', function() {
  describe('fitRectangle', function() {
    it('calculates fitting when the aspect ratio of two rects are the same', function() {
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(3, 3), new Vector2(3, 3))
          .equals(new Box2(new Vector2(0, 0), new Vector2(3, 3)))
      );
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(1, 1), new Vector2(2, 2))
          .equals(new Box2(new Vector2(0, 0), new Vector2(1, 1)))
      );
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(5, 10), new Vector2(1, 2))
          .equals(new Box2(new Vector2(0, 0), new Vector2(5, 10)))
      );
    });

    it('calculates fitting when the outer rect is wider', function() {
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(3, 1), new Vector2(1, 1))
          .equals(new Box2(new Vector2(1, 0), new Vector2(2, 1)))
      );
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(6, 1), new Vector2(4, 2))
          .equals(new Box2(new Vector2(2, 0), new Vector2(4, 1)))
      );
    });

    it('calculates fitting when the outer rect is taller', function() {
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(1, 3), new Vector2(1, 1))
          .equals(new Box2(new Vector2(0, 1), new Vector2(1, 2)))
      );
      assert.isTrue(
        geo
          .fitRectangle(new Vector2(1, 6), new Vector2(2, 4))
          .equals(new Box2(new Vector2(0, 2), new Vector2(1, 4)))
      );
    });
  });
});
