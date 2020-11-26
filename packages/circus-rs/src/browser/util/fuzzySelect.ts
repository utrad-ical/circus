import { Vector3, Box3 } from 'three';
import { AnisotropicRawData, RawData } from '..';
import floodFill3d from './floodFill3d';

type FuzzySelectTarget = '3d' | 'axial' | 'sagittal' | 'coronal';
export default function fuzzySelect(
  target: FuzzySelectTarget,
  mprRawData: AnisotropicRawData,
  startPoint: Vector3,
  threshold: number,
  maxDistance: number,
  cloudRawData: RawData,
  value: number
) {
  const offsetBox = detectOffsetBox(
    mprRawData,
    startPoint,
    maxDistance,
    target
  );
  if (!offsetBox.containsPoint(startPoint)) return;

  const baseValue = mprRawData.getPixelAt(
    startPoint.x,
    startPoint.y,
    startPoint.z
  );
  const maxValue = baseValue + threshold;
  const minValue = baseValue - threshold;

  const binarizer = (p: Vector3) => {
    const value = mprRawData.getPixelAt(p.x, p.y, p.z);
    return minValue <= value && value <= maxValue;
  };

  const fillLine = (p1: Vector3, p2: Vector3) => {
    for (let x = p1.x; x <= p2.x; x++) {
      cloudRawData.writePixelAt(value, x, p1.y, p1.z);
    }
  };

  floodFill3d(startPoint, offsetBox, binarizer, fillLine);
}

/**
 * get boundary box as OFFSET BASED one.
 * including the voxel that is on "max" of the box.
 */
function detectOffsetBox(
  mprRawData: AnisotropicRawData,
  startPoint: Vector3,
  maxDistance: number,
  target: FuzzySelectTarget
) {
  const voxelSize = new Vector3(...mprRawData.getVoxelSize());

  const mprBoudaryOffsetBox = new Box3(
    new Vector3(0, 0, 0),
    new Vector3().fromArray(mprRawData.getDimension()).subScalar(1)
  );
  const maxDistancesInIndex = new Vector3()
    .addScalar(maxDistance)
    .divide(voxelSize)
    .round();

  switch (target) {
    case 'axial':
      maxDistancesInIndex.z = 0;
      break;
    case 'sagittal':
      maxDistancesInIndex.x = 0;
      break;
    case 'coronal':
      maxDistancesInIndex.y = 0;
      break;
  }

  const maxDistanceOffsetBox = new Box3(
    new Vector3(
      startPoint.x - maxDistancesInIndex.x,
      startPoint.y - maxDistancesInIndex.y,
      startPoint.z - maxDistancesInIndex.z
    ),
    new Vector3(
      startPoint.x + maxDistancesInIndex.x,
      startPoint.y + maxDistancesInIndex.y,
      startPoint.z + maxDistancesInIndex.z
    )
  );

  return maxDistanceOffsetBox.intersect(mprBoudaryOffsetBox);
}
