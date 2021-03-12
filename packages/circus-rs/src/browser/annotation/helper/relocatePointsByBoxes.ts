import { Vector3D } from 'circus-rs/src/common/geometry';
import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';
import { Axis, BoundingBox } from './resize';

const relocatePointsByBoxes = (
  handleType: BoundingRectWithHandleHitType,
  orientation: OrientationString,
  originalPoints: Vector3D[],
  originalBoundingBox3: [number[], number[]],
  dragStartPoint: Vector3,
  draggedPoint: Vector3,
  maintainAspectRatio: boolean
): Vector3D[] => {
  if (orientation === 'oblique') throw new Error('Invalid orientation');

  if (handleType === 'rect-outline') {
    const delta = draggedPoint.clone().sub(dragStartPoint);
    return originalPoints.map(
      originalPoint =>
        new Vector3(...originalPoint).add(delta).toArray() as Vector3D
    );
  }

  const nsAxis: Axis = orientation === 'axial' ? 'y' : 'z';
  const ewAxis: Axis = orientation === 'sagittal' ? 'y' : 'x';

  const fixedSide = (() => {
    const set = new Set<'north' | 'south' | 'east' | 'west'>();
    if (/south/.test(handleType)) set.add('north');
    else if (/north/.test(handleType)) set.add('south');
    if (/east/.test(handleType)) set.add('west');
    else if (/west/.test(handleType)) set.add('east');
    return set;
  })();

  const bb: BoundingBox = [
    new Vector3().fromArray(originalBoundingBox3[0]),
    new Vector3().fromArray(originalBoundingBox3[1])
  ];

  const newBb: BoundingBox = (() => {
    const nsDelta = draggedPoint[nsAxis] - dragStartPoint[nsAxis];
    const ewDelta = draggedPoint[ewAxis] - dragStartPoint[ewAxis];
    const boundingBox: BoundingBox = [bb[0].clone(), bb[1].clone()];
    if (fixedSide.has('north')) boundingBox[1][nsAxis] += nsDelta;
    else if (fixedSide.has('south')) boundingBox[0][nsAxis] += nsDelta;
    if (fixedSide.has('west')) boundingBox[1][ewAxis] += ewDelta;
    else if (fixedSide.has('east')) boundingBox[0][ewAxis] += ewDelta;
    return boundingBox;
  })();

  const locationAxisOrigin = {
    [nsAxis]: fixedSide.has('south') ? bb[1][nsAxis] : bb[0][nsAxis],
    [ewAxis]: fixedSide.has('east') ? bb[1][ewAxis] : bb[0][ewAxis]
  };

  const originalBbSize = (ax: Axis) => Math.abs(bb[0][ax] - bb[1][ax]);
  const newBbSize = (ax: Axis) => Math.abs(newBb[0][ax] - newBb[1][ax]);
  const sizeRatio = (ax: Axis) => newBbSize(ax) / originalBbSize(ax);
  const sizeRatios = {
    [nsAxis]: sizeRatio(nsAxis),
    [ewAxis]: sizeRatio(ewAxis)
  };

  const locationInverted = {
    [nsAxis]: draggedPoint[nsAxis] - locationAxisOrigin[nsAxis] > 0,
    [ewAxis]: draggedPoint[ewAxis] - locationAxisOrigin[ewAxis] > 0
  };

  const newLocation = (ax: Axis, originalPoint: Vector3, sizeRatio: number) => {
    return (
      locationAxisOrigin[ax] +
      sizeRatio *
        Math.abs(locationAxisOrigin[ax] - originalPoint[ax]) *
        (locationInverted[ax] ? 1 : -1)
    );
  };

  if (!maintainAspectRatio) {
    return originalPoints.map(originalPoint => {
      const p = new Vector3(...originalPoint);
      const newP = p.clone();
      newP[nsAxis] = newLocation(nsAxis, p, sizeRatios[nsAxis]);
      newP[ewAxis] = newLocation(ewAxis, p, sizeRatios[ewAxis]);
      return newP.toArray() as Vector3D;
    });
  }

  /**
   * Maintain aspect ratio mode (Shift + Drag)
   */

  // dragging axes (x, y or z) on the screen
  // the length can be 1 (dragging on the side) or 2 (dragging on the corner)
  const refAxes = (() => {
    const refs: Axis[] = [];
    if (fixedSide.has('north') || fixedSide.has('south')) refs.push(nsAxis);
    if (fixedSide.has('east') || fixedSide.has('west')) refs.push(ewAxis);
    return refs;
  })();
  const draggingCorner = refAxes.length === 2;

  const winningRatio = draggingCorner
    ? Math.max(...Object.values(sizeRatios))
    : sizeRatios[refAxes[0]];

  const deltaOrigin = (() => {
    const delta = {
      [nsAxis]: 0,
      [ewAxis]: 0
    };
    if (draggingCorner) return delta;

    if (fixedSide.has('east') || fixedSide.has('west')) {
      delta[nsAxis] = (originalBbSize(nsAxis) * (1 - winningRatio)) / 2;
    }
    if (fixedSide.has('south') || fixedSide.has('north')) {
      delta[ewAxis] = (originalBbSize(ewAxis) * (1 - winningRatio)) / 2;
    }
    return delta;
  })();

  return originalPoints.map(originalPoint => {
    const p = new Vector3(...originalPoint);
    const newP = p.clone();
    newP[nsAxis] = newLocation(nsAxis, p, winningRatio) + deltaOrigin[nsAxis];
    newP[ewAxis] = newLocation(ewAxis, p, winningRatio) + deltaOrigin[ewAxis];
    return newP.toArray() as Vector3D;
  });
};

export default relocatePointsByBoxes;
