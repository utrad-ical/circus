import { Vector3 } from 'three';

/**
 * Represents one line segment.
 */
export interface LineSegment {
  origin: Vector3;
  vector: Vector3;
}
