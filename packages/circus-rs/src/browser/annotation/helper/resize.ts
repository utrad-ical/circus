import { Vector3D } from 'circus-rs/src/common/geometry';
import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';
import relocate from './relocate';


const resize = (
  handleType: BoundingRectWithHandleHitType,
  orientation: OrientationString,
  originalBoundingBox3: [number[], number[]],
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  maintainAspectRatio: boolean
): [Vector3D, Vector3D] => {

  const originalPoints: Vector3D[] = [
    originalBoundingBox3[0] as Vector3D,
    originalBoundingBox3[1] as Vector3D
  ];

  return relocate(
    handleType,
    orientation,
    originalPoints,
    originalBoundingBox3,
    dragStartPoint,
    draggedPoint,
    maintainAspectRatio
  ) as [Vector3D, Vector3D];
};

export default resize;
