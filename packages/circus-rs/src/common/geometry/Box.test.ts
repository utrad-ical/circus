import assert from 'node:assert/strict';
import { describe, test, it } from 'node:test';
import { Vector3, Box3 } from 'three';
import * as box from './Box.ts';

describe('intersectionOfBoxAndPlane', () => {
  const cube = new Box3(new Vector3(0, 0, 0), new Vector3(2, 2, 2));

  it('must return 4 points with box and axial section', () => {
    const test = (z: number, points: number[][]) => {
      const intersections = box.intersectionOfBoxAndPlane(cube, {
        origin: [0, 0, z],
        xAxis: [2, 0, 0],
        yAxis: [0, 2, 0]
      });

      assert.equal((intersections || []).length, points.length);
      points.forEach(p => {
        assert.equal(
          intersections!.findIndex(ip => {
            return p[0] == ip.x && p[1] == ip.y && p[2] == ip.z;
          }) >= 0,
          true
        );
      });
    };

    test(0, [
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0],
      [0, 2, 0]
    ]);
    test(1, [
      [0, 0, 1],
      [2, 0, 1],
      [2, 2, 1],
      [0, 2, 1]
    ]);
    test(2, [
      [0, 0, 2],
      [2, 0, 2],
      [2, 2, 2],
      [0, 2, 2]
    ]);
    test(3, []);
    test(-1, []);
  });
});
