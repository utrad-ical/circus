import { DirectedSegment } from './Line';
import { vector2ToPerpendicularClockwise } from './Vector';
import { Vector2 } from 'three';

export function getIsoscelesTriangle(
  apexAngleBisector: DirectedSegment,
  baseLength: number
): Vector2[] {
  if (apexAngleBisector.to.equals(apexAngleBisector.from)) return [];
  const length = baseLength / 2;
  const perpendicular = (ab: DirectedSegment, counter: boolean): Vector2 => {
    return vector2ToPerpendicularClockwise(
      ab.from.clone().sub(ab.to.clone()),
      counter
    )
      .clampLength(length, length)
      .add(ab.to.clone());
  };
  const apexAngle = apexAngleBisector.from.clone();
  const baseAngle1 = perpendicular(apexAngleBisector, true);
  const baseAngle2 = perpendicular(apexAngleBisector, false);
  return [apexAngle, baseAngle1, baseAngle2];
}
