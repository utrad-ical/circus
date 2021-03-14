import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';

export type BoundingBox = [Vector3, Vector3];
export type Axis = 'x' | 'y' | 'z';

export const allAxes: Axis[] = ['x', 'y', 'z'];

/**
 * @deprecated Use relocate().
 * @param handleType
 * @param orientation
 * @param originalBoundingBox3
 * @param startPoint
 * @param dragPoint
 * @param maintainAspectRatio
 * @returns
 */
const resize = (
  handleType: BoundingRectWithHandleHitType,
  orientation: OrientationString,
  originalBoundingBox3: [number[], number[]],
  startPoint: Vector3,
  dragPoint: Vector3,
  maintainAspectRatio: boolean
): [number[], number[]] => {
  if (orientation === 'oblique') throw new Error('Invalid orientation');

  const bb: BoundingBox = [
    new Vector3().fromArray(originalBoundingBox3[0]),
    new Vector3().fromArray(originalBoundingBox3[1])
  ];

  const newBb: BoundingBox = [bb[0].clone(), bb[1].clone()];

  const toArray = (bb: BoundingBox) =>
    [bb[0].toArray(), bb[1].toArray()] as [number[], number[]];

  if (handleType === 'rect-outline') {
    const delta = dragPoint.clone().sub(startPoint);
    return toArray([bb[0].add(delta), bb[1].add(delta)]);
  }

  const nsAxis: Axis = orientation === 'axial' ? 'y' : 'z';
  const ewAxis: Axis = orientation === 'sagittal' ? 'y' : 'x';
  const nsDelta = dragPoint[nsAxis] - startPoint[nsAxis];
  const ewDelta = dragPoint[ewAxis] - startPoint[ewAxis];

  const fixedSide = new Set<'north' | 'south' | 'east' | 'west'>();
  if (/south/.test(handleType)) fixedSide.add('north');
  if (/north/.test(handleType)) fixedSide.add('south');
  if (/east/.test(handleType)) fixedSide.add('west');
  if (/west/.test(handleType)) fixedSide.add('east');

  if (fixedSide.has('north')) newBb[1][nsAxis] += nsDelta;
  if (fixedSide.has('south')) newBb[0][nsAxis] += nsDelta;
  if (fixedSide.has('west')) newBb[1][ewAxis] += ewDelta;
  if (fixedSide.has('east')) newBb[0][ewAxis] += ewDelta;

  if (!maintainAspectRatio) return toArray(newBb);

  //
  // Maintain aspect ratio mode (Shift + Drag)
  //

  // TODO: It still contains a maintain aspect ratio mode bug.
  // In some cases, the annotation of 3d disappears when the image is reduced.

  // dragging axes (x, y or z) on the screen
  // the length can be 1 (dragging on the side) or 2 (dragging on the corner)
  const refAxes: Axis[] = [];
  if (fixedSide.has('north') || fixedSide.has('south')) refAxes.push(nsAxis);
  if (fixedSide.has('east') || fixedSide.has('west')) refAxes.push(ewAxis);

  const originalSizes = refAxes.map(ax => Math.abs(bb[0][ax] - bb[1][ax]));
  const newSizes = refAxes.map(ax => Math.abs(newBb[0][ax] - newBb[1][ax]));
  const ratios = originalSizes.map((s, i) => newSizes[i] / s);
  const winningRatio = Math.max(...ratios);
  const winningAxis = refAxes.find((_, i) => ratios[i] === winningRatio);

  const translate = (fixedPoint: Vector3, ax: Axis, ratio: number) => {
    return (
      fixedPoint[ax] +
      ratio *
        Math.abs(bb[1][ax] - bb[0][ax]) *
        (dragPoint[ax] - fixedPoint[ax] > 0 ? 1 : -1)
    );
  };

  allAxes
    .filter(ax => ax !== winningAxis)
    .forEach(ax => {
      if (refAxes.indexOf(ax) >= 0) {
        // "lost" axes on the section, when refAxes.length === 2:
        // its size will be recalculated
        if (fixedSide.has('north'))
          newBb[1][nsAxis] = translate(bb[0], nsAxis, winningRatio);
        if (fixedSide.has('south'))
          newBb[0][nsAxis] = translate(bb[1], nsAxis, winningRatio);
        if (fixedSide.has('west'))
          newBb[1][ewAxis] = translate(bb[0], ewAxis, winningRatio);
        if (fixedSide.has('east'))
          newBb[0][ewAxis] = translate(bb[1], ewAxis, winningRatio);
      } else {
        // "free" axes that will be scaled evenly
        // toward the plus and minus directions
        newBb[0][ax] =
          (bb[0][ax] * (1 + winningRatio) + bb[1][ax] * (1 - winningRatio)) / 2;
        newBb[1][ax] =
          (bb[0][ax] * (1 - winningRatio) + bb[1][ax] * (1 + winningRatio)) / 2;
      }
    });

  return toArray(newBb);
};

export default resize;
