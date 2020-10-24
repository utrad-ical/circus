import { Vector3, Vector2 } from 'three';

export type Vector3D = [number, number, number];

export type Vector2D = [number, number];

/**
 * Converts a Vector2 to a Vector3.
 * (The z is set to zero in the result)
 * @param target Vector2
 */
export function vector2ToVector3(target: Vector2): Vector3 {
  return new Vector3(target.x, target.y, 0);
}

export function vector2ToPerpendicularClockwise(
  target: Vector2,
  counter: boolean = false
): Vector2 {
  return counter
    ? new Vector2(-target.y, target.x)
    : new Vector2(target.y, -target.x);
}
