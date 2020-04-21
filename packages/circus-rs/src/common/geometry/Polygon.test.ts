import * as polygon from './Polygon';
import { Vector2 } from 'three';

describe('intersectsPolygon', () => {
  const t = (polygon1: Vector2[], polygon2: Vector2[], expected: boolean) => {
    expect(polygon.intersectsPolygon(polygon1, polygon2)).toBe(expected);
    expect(polygon.intersectsPolygon(polygon2, polygon1)).toBe(expected);
  };
  const v2 = (x: number, y: number) => new Vector2(x, y);

  test('no overlap between the two polygons', () => {
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(-10, -10), v2(-10, -20), v2(-20, -20), v2(-20, -10)],
      false
    );
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(-0.1, 0), v2(0, -10), v2(-10, -10), v2(-10, 0)],
      false
    );
  });
  test('sides of the two polygons intersect', () => {
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(0, 0), v2(0, -10), v2(-10, -10), v2(-10, 0)],
      true
    );
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(5, 5), v2(15, 10), v2(15, 0)],
      true
    );
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(10, 0), v2(10, 10), v2(20, 0)],
      true
    );
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(10, 5), v2(10, 15), v2(20, 5)],
      true
    );
  });
  test('the vertex of one polygon is inside the other polygon', () => {
    t(
      [v2(0, 0), v2(0, 10), v2(10, 10), v2(10, 0)],
      [v2(1, 5), v2(3, 9), v2(5, 9), v2(9, 5), v2(4, 1), v2(2, 2)],
      true
    );
    t(
      [v2(1, 5), v2(3, 9), v2(5, 9), v2(9, 5), v2(4, 1), v2(2, 2)],
      [v2(2, 6), v2(4, 8), v2(6, 6), v2(4, 2)],
      true
    );
  });
});
