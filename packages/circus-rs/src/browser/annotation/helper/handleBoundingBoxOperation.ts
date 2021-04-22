import { Vector3D } from 'circus-rs/src/common/geometry';
import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';

type BoundingBox = [Vector3, Vector3];
type Axis = 'x' | 'y' | 'z';
type Axes = {
  xAxis: Axis;
  yAxis: Axis;
  zAxis: Axis;
};

const getAxes = (orientation: OrientationString): Axes => {
  const xAxis: Axis = orientation === 'sagittal' ? 'y' : 'x';
  const yAxis: Axis = orientation === 'axial' ? 'y' : 'z';
  const zAxis = ['x', 'y', 'z'].find(v => v != xAxis && v != yAxis) as Axis;
  return { xAxis, yAxis, zAxis };
};

const winningAxes = (
  handleType: BoundingRectWithHandleHitType,
  axes: Axes
): Axis[] => {
  switch (handleType) {
    case 'north-west-handle':
    case 'south-east-handle':
    case 'north-east-handle':
    case 'south-west-handle':
      return [axes.xAxis, axes.yAxis];

    case 'north-handle':
    case 'south-handle':
      return [axes.yAxis];

    case 'east-handle':
    case 'west-handle':
      return [axes.xAxis];

    default:
      throw new Error('Invalid handleType');
  }
};

const getDragDelta = (
  handleType: BoundingRectWithHandleHitType,
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  axes: Axes
): Vector3 => {
  const dragDelta = draggedPoint.clone().sub(dragStartPoint);
  switch (handleType) {
    case 'north-handle':
    case 'south-handle':
      dragDelta[axes.xAxis] = 0;
      break;
    case 'east-handle':
    case 'west-handle':
      dragDelta[axes.yAxis] = 0;
      break;
  }
  return dragDelta;
};

const toBoundingBox = (bb: [number[], number[]]): BoundingBox => [
  new Vector3().fromArray(bb[0]),
  new Vector3().fromArray(bb[1])
];

const resizeBoundingBox = (
  handleType: BoundingRectWithHandleHitType,
  axes: Axes,
  delta: Vector3,
  originalBb: BoundingBox
): BoundingBox => {
  const boundingBox: BoundingBox = [
    originalBb[0].clone(),
    originalBb[1].clone()
  ];

  switch (handleType) {
    case 'north-handle':
    case 'north-west-handle':
    case 'north-east-handle':
      boundingBox[0][axes.yAxis] += delta[axes.yAxis];
      break;
    case 'south-handle':
    case 'south-west-handle':
    case 'south-east-handle':
      boundingBox[1][axes.yAxis] += delta[axes.yAxis];
      break;
  }

  switch (handleType) {
    case 'west-handle':
    case 'north-west-handle':
    case 'south-west-handle':
      boundingBox[0][axes.xAxis] += delta[axes.xAxis];
      break;
    case 'east-handle':
    case 'north-east-handle':
    case 'south-east-handle':
      boundingBox[1][axes.xAxis] += delta[axes.xAxis];
      break;
  }

  return boundingBox;
};

const getResizeRatios = (
  handleType: BoundingRectWithHandleHitType,
  axes: Axes,
  originalBb: BoundingBox,
  resizedBb: BoundingBox,
  maintainAspectRatio: boolean
): Vector3D => {
  const originalBbSize = originalBb[1].clone().sub(originalBb[0]).toArray();
  const scaledBbSize = resizedBb[1].clone().sub(resizedBb[0]).toArray();
  const ratioBbSize = scaledBbSize.map((v, i) => v / originalBbSize[i]);
  const resizeRatios = new Vector3(...ratioBbSize);
  if (maintainAspectRatio) {
    const winningRatio = winningAxes(handleType, axes)
      .map(ax => resizeRatios[ax])
      .sort((a, b) => a - b)[0];

    resizeRatios[axes.xAxis] = ['north-handle', 'south-handle'].some(
      v => v === handleType
    )
      ? Math.abs(winningRatio)
      : winningRatio;

    resizeRatios[axes.yAxis] = ['west-handle', 'east-handle'].some(
      v => v === handleType
    )
      ? Math.abs(winningRatio)
      : winningRatio;

    resizeRatios[axes.zAxis] = winningRatio;
  }
  return resizeRatios.toArray() as Vector3D;
};

const getScaleOrigin = (
  handleType: BoundingRectWithHandleHitType,
  axes: Axes,
  originalBb: BoundingBox
): Vector3D => {
  switch (handleType) {
    case 'north-west-handle':
      return originalBb[1].toArray() as Vector3D;
    case 'south-east-handle':
      return originalBb[0].toArray() as Vector3D;
  }

  const originalBbSize = originalBb[1].clone().sub(originalBb[0]);
  const scaleOrigin = originalBb[0].clone();
  switch (handleType) {
    case 'north-east-handle':
      scaleOrigin[axes.yAxis] = originalBb[1][axes.yAxis];
      break;
    case 'south-west-handle':
      scaleOrigin[axes.xAxis] = originalBb[1][axes.xAxis];
      break;
    case 'south-handle':
      scaleOrigin[axes.xAxis] += originalBbSize[axes.xAxis] / 2;
      break;
    case 'east-handle':
      scaleOrigin[axes.yAxis] += originalBbSize[axes.yAxis] / 2;
      break;
    case 'north-handle':
      scaleOrigin[axes.xAxis] += originalBbSize[axes.xAxis] / 2;
      scaleOrigin[axes.yAxis] = originalBb[1][axes.yAxis];
      break;
    case 'west-handle':
      scaleOrigin[axes.xAxis] = originalBb[1][axes.xAxis];
      scaleOrigin[axes.yAxis] += originalBbSize[axes.yAxis] / 2;
      break;
    default:
      throw new Error('Invalid handleType');
  }
  return scaleOrigin.toArray() as Vector3D;
};

const handleBoundingBoxOperation = (
  originalBoundingBox3: [number[], number[]],
  orientation: OrientationString,
  handleType: BoundingRectWithHandleHitType,
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  maintainAspectRatio: boolean,
  originalPoints: Vector3D[]
): Vector3D[] => {
  if (orientation === 'oblique') throw new Error('Invalid orientation');

  const axes = getAxes(orientation);
  const delta = getDragDelta(handleType, dragStartPoint, draggedPoint, axes);

  if (handleType === 'rect-outline') {
    // Relocate points as the bounding box moves
    return originalPoints.map(
      p => new Vector3(...p).add(delta).toArray() as Vector3D
    );
  } else {
    // Relocate points as the bounding box resizes
    const originalBb = toBoundingBox(originalBoundingBox3);
    const resizedBb = resizeBoundingBox(handleType, axes, delta, originalBb);
    const scaleOrigin = getScaleOrigin(handleType, axes, originalBb);
    const resizeRatios = getResizeRatios(
      handleType,
      axes,
      originalBb,
      resizedBb,
      maintainAspectRatio
    );
    return originalPoints.map(
      p =>
        resizeRatios.map(
          (r, i) => (p[i] - scaleOrigin[i]) * r + scaleOrigin[i]
        ) as Vector3D
    );
  }
};

export default handleBoundingBoxOperation;
