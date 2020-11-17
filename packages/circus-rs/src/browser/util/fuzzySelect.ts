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
  threshold: number,
  value: number
): RawData {
  const size = bounding
    .getSize(new Vector3())
    .add(new Vector3(1, 1, 1))
    .toArray() as Vector3D;
  const selectedRawData = new RawData(size, 'binary');

  selectedRawData.fillAll(1);

  return selectedRawData;
}
