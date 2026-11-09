import type { Vector3D } from '../../../common/geometry/index.ts';
import type { Vector3 } from 'three';
import type { OrientationString } from '../../section-util.ts';
import type { BoundingRectWithHandleHitType } from './hit-test.ts';
import handleBoundingBoxOperation from './handleBoundingBoxOperation.ts';

const resize = (
  handleType: BoundingRectWithHandleHitType,
  orientation: OrientationString,
  originalBoundingBox3: [number[], number[]],
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  maintainAspectRatio: boolean,
  fixCenterOfGravity: boolean
): [Vector3D, Vector3D] => {
  const originalPoints: Vector3D[] = [
    originalBoundingBox3[0] as Vector3D,
    originalBoundingBox3[1] as Vector3D
  ];

  return handleBoundingBoxOperation(
    originalBoundingBox3,
    orientation,
    handleType,
    dragStartPoint,
    draggedPoint,
    maintainAspectRatio,
    fixCenterOfGravity,
    originalPoints
  ) as [Vector3D, Vector3D];
};

export default resize;
