'use strict';

const { Vector3, Box3 } = require('three');
const box = require('../src/common/geometry/Box');
const assert = require('chai').assert;

describe('Box', function() {
  describe('#intersectionOfBoxAndPlane', function() {
    const cube = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));

    it('must return 4 points with box and axial section', function() {
      function test(z, points) {
        const intersections = box.intersectionOfBoxAndPlane(cube, {
          origin: new Vector3(0, 0, z),
          xAxis: new Vector3(2, 0, 0),
          yAxis: new Vector3(0, 2, 0)
        });

        assert.strictEqual((intersections || []).length, points.length);
        points.forEach(p => {
          assert.isTrue(
            intersections.findIndex(ip => {
              return p[0] == ip.x && p[1] == ip.y && p[2] == ip.z;
            }) >= 0
          );
        });
      }

      test(0, [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]]);
      test(1, [[0, 0, 1], [2, 0, 1], [2, 2, 1], [0, 2, 1]]);
      test(2, [[0, 0, 2], [2, 0, 2], [2, 2, 2], [0, 2, 2]]);
      test(3, []);
      test(-1, []);
    });
  });
});
