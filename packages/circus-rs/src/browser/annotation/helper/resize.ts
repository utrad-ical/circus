import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';

export default function resize(
  handleType: BoundingRectWithHandleHitType | undefined,
  orientation: OrientationString,
  originalBoundingBox3: [number[], number[]],
  delta: Vector3
): [number[], number[]] {
  const [min, max] = [
    new Vector3().fromArray(originalBoundingBox3[0]),
    new Vector3().fromArray(originalBoundingBox3[1])
  ];
  let newMin: Vector3;
  let newMax: Vector3;

  switch (handleType) {
    case 'north-west-handle':
      [newMin, newMax] = _nwResize(orientation, min, max, delta);
      break;
    case 'north-handle':
      [newMin, newMax] = _nResize(orientation, min, max, delta);
      break;
    case 'north-east-handle':
      [newMin, newMax] = _neResize(orientation, min, max, delta);
      break;
    case 'east-handle':
      [newMin, newMax] = _eResize(orientation, min, max, delta);
      break;
    case 'south-east-handle':
      [newMin, newMax] = _seResize(orientation, min, max, delta);
      break;
    case 'south-handle':
      [newMin, newMax] = _sResize(orientation, min, max, delta);
      break;
    case 'south-west-handle':
      [newMin, newMax] = _swResize(orientation, min, max, delta);
      break;
    case 'west-handle':
      [newMin, newMax] = _wResize(orientation, min, max, delta);
      break;
    case 'rect-outline':
      [newMin, newMax] = _move(min, max, delta);
      break;
    default:
      [newMin, newMax] = [min.clone(), max.clone()];
      break;
  }

  return [newMin.toArray(), newMax.toArray()];
}

function _eResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMax.x += delta.x;
      break;
    case 'sagittal':
      newMax.y += delta.y;
      break;
    case 'coronal':
      newMax.x += delta.x;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _wResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMin.x += delta.x;
      break;
    case 'sagittal':
      newMin.y += delta.y;
      break;
    case 'coronal':
      newMin.x += delta.x;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _sResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMax.y += delta.y;
      break;
    case 'sagittal':
      newMax.z += delta.z;
      break;
    case 'coronal':
      newMax.z += delta.z;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _nResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMin.y += delta.y;
      break;
    case 'sagittal':
      newMin.z += delta.z;
      break;
    case 'coronal':
      newMin.z += delta.z;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _seResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMax.x += delta.x;
      newMax.y += delta.y;
      break;
    case 'sagittal':
      newMax.y += delta.y;
      newMax.z += delta.z;
      break;
    case 'coronal':
      newMax.x += delta.x;
      newMax.z += delta.z;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _swResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMin.x += delta.x;
      newMax.y += delta.y;
      break;
    case 'sagittal':
      newMin.y += delta.y;
      newMax.z += delta.z;
      break;
    case 'coronal':
      newMin.x += delta.x;
      newMax.z += delta.z;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _neResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMin.y += delta.y;
      newMax.x += delta.x;
      break;
    case 'sagittal':
      newMin.z += delta.z;
      newMax.y += delta.y;
      break;
    case 'coronal':
      newMin.z += delta.z;
      newMax.x += delta.x;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _nwResize(
  orientation: OrientationString,
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = originalMin.clone();
  const newMax = originalMax.clone();
  switch (orientation) {
    case 'axial':
      newMin.x += delta.x;
      newMin.y += delta.y;
      break;
    case 'sagittal':
      newMin.y += delta.y;
      newMin.z += delta.z;
      break;
    case 'coronal':
      newMin.x += delta.x;
      newMin.z += delta.z;
      break;
    default:
      break;
  }
  return [newMin, newMax];
}

function _move(
  originalMin: Vector3,
  originalMax: Vector3,
  delta: Vector3
): [Vector3, Vector3] {
  const newMin = new Vector3(
    originalMin.x + delta.x,
    originalMin.y + delta.y,
    originalMin.z + delta.z
  );
  const newMax = new Vector3(
    originalMax.x + delta.x,
    originalMax.y + delta.y,
    originalMax.z + delta.z
  );
  return [newMin, newMax];
}
