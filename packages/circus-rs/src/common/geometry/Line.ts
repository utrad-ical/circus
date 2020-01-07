import { Vector2 } from 'three';

export interface DirectedSegment {
  from: Vector2;
  to: Vector2;
}

/**
 * Determine center of line.
 * @param ab line segment AB
 * @return center of line
 */
export function centerDirectedSegment(ab: DirectedSegment): Vector2 {
  return ab.from.clone().add(
    ab.to
      .clone()
      .sub(ab.from)
      .multiplyScalar(0.5)
  );
}

/**
 * Determine whether line segments AB and CD intersect. (including end points)
 * @param ab line segment AB
 * @param cd line segment CD
 * @return True if two line segments intersect.
 */
export function intersectsDirectedSegment(
  ab: DirectedSegment,
  cd: DirectedSegment
): boolean {
  return _intersectsDirectedSegment(ab.from, ab.to, cd.from, cd.to);
}

/**
 * Determine whether line segments AB and CD intersect (including end points).
 * Returns false if a point is given instead of a line segment.
 * Returns false if two line segments are parallel (including collinear).
 * @param p1 An end point of the line segment AB
 * @param p2 An end point of the line segment AB
 * @param p4 An end point of the line segment CD
 * @param p3 An end point of the line segment CD
 * @return True if the two line segments intersect.
 */
function _intersectsDirectedSegment(
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  p4: Vector2
): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) {
    return false;
  }

  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return false;
  }

  return true;
}
