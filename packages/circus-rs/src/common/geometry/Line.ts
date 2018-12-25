import { Vector2 } from 'three';

export interface DirectedSegment {
  from: Vector2;
  to: Vector2;
}

/**
 * Determine whether line segment ab and line segment cd intersect. (including end points)
 * @param ab line segment ab
 * @param cd line segment cd
 * @return True if two line segments intersect.
 */
export function intersectsDirectedSegment(
  ab: DirectedSegment,
  cd: DirectedSegment
): boolean {
  return _intersectsDirectedSegment(ab.from, ab.to, cd.from, cd.to);
}

/**
 * Determine whether line segment ab and line segment cd intersect. (including end points)
 * @param a end point of line segment ab
 * @param b end point of line segment ab
 * @param c end point of line segment cd
 * @param d end point of line segment cd
 * @return True if two line segments intersect.
 */
function _intersectsDirectedSegment(
  a: Vector2,
  b: Vector2,
  c: Vector2,
  d: Vector2
): boolean {
  var ta = (c.x - d.x) * (a.y - c.y) + (c.y - d.y) * (c.x - a.x);
  var tb = (c.x - d.x) * (b.y - c.y) + (c.y - d.y) * (c.x - b.x);
  var tc = (a.x - b.x) * (c.y - a.y) + (a.y - b.y) * (a.x - c.x);
  var td = (a.x - b.x) * (d.y - a.y) + (a.y - b.y) * (a.x - d.x);
  return tc * td <= 0 && ta * tb <= 0;
}
