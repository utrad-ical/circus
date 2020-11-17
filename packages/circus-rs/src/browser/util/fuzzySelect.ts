import { Vector3, Box3 } from 'three';
import { RawData, Vector3D } from '..';

/**
 * bluh bluh bluh bluh bluh bluh
 * @todo implement this function(now this is stub)
 */
export default function fuzzySelect(
  volume: RawData,
  startPoint: Vector3,
  bounding: Box3,
  threshold: number
): RawData {
  const size = bounding
    .getSize(new Vector3())
    .add(new Vector3(1, 1, 1))
    .toArray() as Vector3D;

  // Todo: Remove this code (and the function) if the requirement
  // that the size must be divisible by 8 is removed.
  adjustSizeToDivisible8(size);

  const selectedRawData = new RawData(size, 'binary');

  selectedRawData.fillAll(1);

  return selectedRawData;
}

function adjustSizeToDivisible8(size: Vector3D) {
  if (size[0] % 8 !== 0) {
    size[0] = Math.ceil(size[0] / 8) * 8;
  }
}
