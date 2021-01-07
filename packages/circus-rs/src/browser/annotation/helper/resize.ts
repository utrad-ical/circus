import { Vector3 } from 'three';
import { OrientationString } from '../../section-util';
import { BoundingRectWithHandleHitType } from './hit-test';

type BoundingBox = [Vector3, Vector3];
type Axis = 'x' | 'y' | 'z';

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

  if (fixedSide.has('north')) bb[1][nsAxis] += nsDelta;
  if (fixedSide.has('south')) bb[0][nsAxis] += nsDelta;
  if (fixedSide.has('west')) bb[1][ewAxis] += ewDelta;
  if (fixedSide.has('east')) bb[0][ewAxis] += ewDelta;

  return toArray(bb);
};

export default resize;
