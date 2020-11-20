import { Vector3, Box3 } from 'three';
import voxelMarker from './voxelMarker';

/**
 * Calls the specified function(fillLine) for each chunked line detected
 * by flood fill algorithm.
 * Use specified binarizer to check if a voxel is the target.
 *
 * Argument points for fillLine have always same y value and same z value,
 * sometimes same x value.
 * 
 * This function does NOT take into account that the specified functions
 * might modify the argument points(Vector3).
 * DON'T DO THAT.
 */
export default function floodFill3d(
  startPoint: Vector3,
  offsetBox: Box3,
  binarizer: (p: Vector3) => boolean,
  fillLine: (p1: Vector3, p2: Vector3) => void
) {
  if (!offsetBox.containsPoint(startPoint) || !binarizer(startPoint)) return;

  const stack: Vector3[] = [startPoint];
  const { min, max } = offsetBox;
  const { marks, marked } = voxelMarker(offsetBox);

  const stackPoints = (walker: Vector3, xend: number) => {
    let isScanLine = false;
    for (; walker.x <= xend; walker.x++) {
      const mustStack = !marked(walker) && binarizer(walker);
      if (!isScanLine && mustStack) {
        stack.push(walker.clone());
        isScanLine = true;
      } else if (isScanLine && !mustStack) {
        isScanLine = false;
      }
    }
  };

  while (stack.length > 0) {
    const cur = stack.shift()!;
    if (marked(cur)) continue;

    // x adjacent points of scan-line's endpoint
    const left = cur.clone();
    const right = cur.clone();

    // find start of scan-line
    do {
      left.x--;
    } while (min.x <= left.x && !marked(left) && binarizer(left));
    // find start of scan-line
    do {
      right.x++;
    } while (right.x <= max.x && !marked(right) && binarizer(right));

    // adjust the points to endpoint from theirs neighbor.
    left.x++;
    right.x--;

    // mark as scaned
    marks(left, right.x);

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
}
