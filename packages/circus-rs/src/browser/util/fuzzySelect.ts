import { Vector3, Box3 } from 'three';
import { RawData, Vector3D } from '..';
import { bitsMarker, bufferMarker } from './line-marker';

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
  const origin = bounding.min;
  const size = bounding
    .getSize(new Vector3())
    .addScalar(1)
    .toArray() as Vector3D;

  const voxels = size[0] * size[1] * size[2];

  // Todo: Remove this code (and the function) if the requirement
  // that the size must be divisible by 8 is removed.
  adjustSizeToDivisible8(size);

  const selectedRawData = new RawData(size, 'binary');

  const baseValue = volume.getPixelAt(startPoint.x, startPoint.y, startPoint.z);
  const maxValue = baseValue + threshold;
  const minValue = baseValue - threshold;

  console.log('BEGIN');
  console.time('floodFill3D w/o write to partial cloud');
  const binarize = (p: Vector3) => {
    const value = volume.getPixelAt(p.x, p.y, p.z);
    return minValue <= value && value <= maxValue;
  };
  let callCounter = 0;
  let filled = 0;
  const fillLine = (p1: Vector3, p2: Vector3) => {
    ++callCounter;
    for (let x = p1.x; x <= p2.x; x++) {
      ++filled;
      selectedRawData.writePixelAt(
        1,
        x - origin.x,
        p1.y - origin.y,
        p1.z - origin.z
      );
    }
  };
  floodFill3D(startPoint, bounding, binarize, fillLine);
  console.timeEnd('floodFill3D w/o write to partial cloud');
  console.log('call: ' + callCounter.toString());
  console.log(
    'filled: ' +
      filled.toString() +
      ' ' +
      (Math.round((filled / voxels) * 10000) / 100).toString() +
      '%'
  );

  // selectedRawData.fillAll(1);
  return selectedRawData;
}

function adjustSizeToDivisible8(size: Vector3D) {
  if (size[0] % 8 !== 0) {
    size[0] = Math.ceil(size[0] / 8) * 8;
  }
}

// This function does NOT take into account that the specified functions
// might modify the argument points.
// DON'T do that.
function floodFill3D(
  startPoint: Vector3,
  boundary: Box3,
  binarize: (p: Vector3) => boolean,
  fillLine: (p1: Vector3, p2: Vector3) => void
) {
  if (!binarize(startPoint)) return;

  const stack: Vector3[] = [startPoint];
  const { min, max } = boundary;
  // const { marks, marked } = bufferMarker(boundary);
  // const { marks, marked } = stupidMarker();
  // const { marks, marked } = objectMarker();
  const { marks, marked } = bitsMarker(boundary);

  const stackPoints = (walker: Vector3, xend: number) => {
    let isScanLine = false;
    for (; walker.x <= xend; walker.x++) {
      const mustStack = !marked(walker) && binarize(walker);
      if (!isScanLine && mustStack) {
        stack.push(walker.clone());
        isScanLine = true;
      } else if (isScanLine && !mustStack) {
        isScanLine = false;
      }
    }
  };

  let maxStackLength = 0;
  while (stack.length > 0) {
    maxStackLength = Math.max(maxStackLength, stack.length);
    const cur = stack.shift()!;
    if (marked(cur)) continue;

    // x adjacent points of scan-line's endpoint
    let left = cur.clone();
    let right = cur.clone();

    // find start of scan-line
    do {
      left.x--;
    } while (min.x <= left.x && !marked(left) && binarize(left));
    // find start of scan-line
    do {
      right.x++;
    } while (right.x <= max.x && !marked(right) && binarize(right));

    // adjust the points to endpoint from theirs neighbor.
    left.x++;
    right.x--;

    // mark as scaned
    marks(left, right.x);
    // console.error(
    //   'Line: [' +
    //     left.toArray().toString() +
    //     '] to [' +
    //     right.toArray().toString() +
    //     ']'
    // );

    // process the line
    fillLine(left, right);

    // find scan-lines above the current one
    if (min.y < cur.y) {
      const walker = left.clone().setY(cur.y - 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines below the current one
    if (cur.y < max.y) {
      const walker = left.clone().setY(cur.y + 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines front the current one
    if (min.z < cur.z) {
      const walker = left.clone().setZ(cur.z - 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines behind the current one
    if (cur.z < max.z) {
      const walker = left.clone().setZ(cur.z + 1);
      stackPoints(walker, right.x);
    }
  }
  console.log('maxStackLength');
  console.log(maxStackLength);
}
// const start = new Vector3(2, 2, 2);
// const marker = stupidMarker();
// const dumper = markStateColDumper(marker.marked);
// let counter = 0;
// floodFill3D(
//   start,
//   boundary,
//   // (p: Vector3) => (p.x + p.y + p.z <= 7),
//   // (p: Vector3) => (p.x + p.y + p.z <= 7) && (p.y %2 === 0),
//   (p: Vector3) =>
//     Math.pow(p.x - start.x, 2) +
//       Math.pow(p.y - start.y, 2) +
//       Math.pow(p.z - start.z, 2) <=
//     Math.pow(2, 2),
//   (p1: Vector3, p2: Vector3) => {
//     ++counter;
//   },
//   marker
// );
// console.log(dumper(boundary));
