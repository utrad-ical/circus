import { Vector3D } from '../../../common/geometry';
import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';
import handleBoundingBoxOperation from './handleBoundingBoxOperation';

const resize = (
  handleType: BoundingRectWithHandleHitType,
  orientation: OrientationString,
  originalBoundingBox3: [number[], number[]],
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  lockMaintainAspectRatio: boolean,
  lockFixCenterOfGravity: boolean
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
    lockMaintainAspectRatio,
    lockFixCenterOfGravity,
    originalPoints
  ) as [Vector3D, Vector3D];
};

export default resize;
