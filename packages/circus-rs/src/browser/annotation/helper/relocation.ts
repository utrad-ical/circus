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

  const originalBbSizes = refAxes.map(ax => Math.abs(bb[0][ax] - bb[1][ax]));
  const newBbSizes = refAxes.map(ax => Math.abs(newBb[0][ax] - newBb[1][ax]));
  const ratios = originalBbSizes.map((s, i) => newBbSizes[i] / s);

  if (!maintainAspectRatio)
    return originalPoints.map(originalPoint => {
      const p = new Vector3(...originalPoint);
      const nsAxisOrigin = fixedSide.has('south')
        ? bb[1][nsAxis]
        : bb[0][nsAxis];
      const ewAxisOrigin = fixedSide.has('east')
        ? bb[1][ewAxis]
        : bb[0][ewAxis];
      const nsSize = Math.abs(p[nsAxis] - nsAxisOrigin);
      const ewSize = Math.abs(p[ewAxis] - ewAxisOrigin);
      const nsNewSize = nsSize * ratios[0];
      const ewNewSize = ewSize * (ratios.length == 1 ? ratios[0] : ratios[1]);
      const nsInverted = draggedPoint[nsAxis] - nsAxisOrigin > 0;
      const ewInverted = draggedPoint[ewAxis] - ewAxisOrigin > 0;

      const newP = p.clone();
      if (fixedSide.has('north') || fixedSide.has('south')) {
        newP[nsAxis] = nsAxisOrigin + nsNewSize * (nsInverted ? 1 : -1);
      }
      if (fixedSide.has('west') || fixedSide.has('east')) {
        newP[ewAxis] = ewAxisOrigin + ewNewSize * (ewInverted ? 1 : -1);
      }
      return newP.toArray() as Vector3D;
    });

  //
  //TODO: Maintain aspect ratio mode (Shift + Drag)
  //
  return [];
};

export default relocation;
