'use strict';

const geo = require('../src/common/geometry');
const assert = require('chai').assert;

describe('Rectangle', function() {
  describe('fitRectangle', function() {
    it('calculates fitting when the aspect ratio of two rects are the same', function() {
      assert.deepEqual(geo.fitRectangle([3, 3], [3, 3]), {
        origin: [0, 0],
        size: [3, 3]
      });
      assert.deepEqual(geo.fitRectangle([1, 1], [2, 2]), {
        origin: [0, 0],
        size: [1, 1]
      });
      assert.deepEqual(geo.fitRectangle([5, 10], [1, 2]), {
        origin: [0, 0],
        size: [5, 10]
      });
    });

    it('calculates fitting when the outer rect is wider', function() {
      assert.deepEqual(geo.fitRectangle([3, 1], [1, 1]), {
        origin: [1, 0],
        size: [1, 1]
      });
      assert.deepEqual(geo.fitRectangle([6, 1], [4, 2]), {
        origin: [2, 0],
        size: [2, 1]
      });
    });

    it('calculates fitting when the outer rect is taller', function() {
      assert.deepEqual(geo.fitRectangle([1, 3], [1, 1]), {
        origin: [0, 1],
        size: [1, 1]
      });
      assert.deepEqual(geo.fitRectangle([1, 6], [2, 4]), {
        origin: [0, 2],
        size: [1, 2]
      });
    });
  });
});
