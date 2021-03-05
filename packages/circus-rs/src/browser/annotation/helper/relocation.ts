import { Vector3D } from 'circus-rs/src/common/geometry';
import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';

type BoundingBox = [Vector3, Vector3];
type Axis = 'x' | 'y' | 'z';

const allAxes: Axis[] = ['x', 'y', 'z'];

const relocation = (
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

  const nsDelta = draggedPoint[nsAxis] - dragStartPoint[nsAxis];
  const ewDelta = draggedPoint[ewAxis] - dragStartPoint[ewAxis];

  const fixedSide = new Set<'north' | 'south' | 'east' | 'west'>();
  if (/south/.test(handleType)) fixedSide.add('north');
  else if (/north/.test(handleType)) fixedSide.add('south');
  if (/east/.test(handleType)) fixedSide.add('west');
  else if (/west/.test(handleType)) fixedSide.add('east');

  const bb: BoundingBox = [
    new Vector3().fromArray(originalBoundingBox3[0]),
    new Vector3().fromArray(originalBoundingBox3[1])
  ];
  const newBb: BoundingBox = [bb[0].clone(), bb[1].clone()];
  if (fixedSide.has('north')) newBb[1][nsAxis] += nsDelta;
  else if (fixedSide.has('south')) newBb[0][nsAxis] += nsDelta;
  if (fixedSide.has('west')) newBb[1][ewAxis] += ewDelta;
  else if (fixedSide.has('east')) newBb[0][ewAxis] += ewDelta;

  // dragging axes (x, y or z) on the screen
  // the length can be 1 (dragging on the side) or 2 (dragging on the corner)
  const refAxes: Axis[] = [];
  if (fixedSide.has('north') || fixedSide.has('south')) refAxes.push(nsAxis);
  if (fixedSide.has('east') || fixedSide.has('west')) refAxes.push(ewAxis);

  const originalSizes = refAxes.map(ax => Math.abs(bb[0][ax] - bb[1][ax]));
  const newSizes = refAxes.map(ax => Math.abs(newBb[0][ax] - newBb[1][ax]));
  const ratios = originalSizes.map((s, i) => newSizes[i] / s);

  if (!maintainAspectRatio)
    return originalPoints.map(originalPoint => {
      const p = new Vector3(...originalPoint);
      const nsAxisOrigin = fixedSide.has('north')
        ? bb[0][nsAxis]
        : fixedSide.has('south')
        ? bb[1][nsAxis]
        : bb[0][nsAxis];

      const ewAxisOrigin = fixedSide.has('west')
        ? bb[0][ewAxis]
        : fixedSide.has('east')
        ? bb[1][ewAxis]
        : bb[0][ewAxis];

      const nsSize = Math.abs(p[nsAxis] - nsAxisOrigin);
      const ewSize = Math.abs(p[ewAxis] - ewAxisOrigin);
      const nsDelta = nsSize * ratios[0];
      const ewDelta = ewSize * (ratios.length == 1 ? ratios[0] : ratios[1]);

      const newP = p.clone();
      if (fixedSide.has('north')) newP[nsAxis] = nsAxisOrigin + nsDelta;
      else if (fixedSide.has('south')) newP[nsAxis] = nsAxisOrigin - nsDelta;
      if (fixedSide.has('west')) newP[ewAxis] = ewAxisOrigin + ewDelta;
      else if (fixedSide.has('east')) newP[ewAxis] = ewAxisOrigin - ewDelta;

      return newP.toArray() as Vector3D;
    });

  //
  //TODO: Maintain aspect ratio mode (Shift + Drag)
  //
  return [];

};

export default relocation;
