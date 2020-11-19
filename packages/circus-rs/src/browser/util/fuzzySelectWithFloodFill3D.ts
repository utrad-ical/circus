import { Vector3, Box3 } from 'three';
import { bufferMarker } from './line-marker';

/**
 * bluh bluh bluh bluh bluh bluh
 *
 * This function does NOT take into account that the specified functions
 * might modify the argument points(Vector3).
 * DON'T do that.
 */
export default function fuzzySelectWithFloodFill3D(
  startPoint: Vector3,
  offsetBox: Box3,
  binarize: (p: Vector3) => boolean,
  fillLine: (p1: Vector3, p2: Vector3) => void
) {
  if (!binarize(startPoint)) return;

  const report = {
    _start: () => (report.start = new Date().getTime()),
    _finish: () => {
      report.finish = new Date().getTime();
      report.procTime = report.finish - report.start;
      delete (report as any).start;
      delete (report as any).finish;
      delete (report as any)._start;
      delete (report as any)._finish;
      report.matchedRate =
        Math.round((report.matchedVoxels / report.targetVoxels) * 10000) / 100;
    },
    start: 0,
    finish: 0,
    targetVoxels:
      (offsetBox.max.x - offsetBox.min.x + 1) *
      (offsetBox.max.y - offsetBox.min.y + 1) *
      (offsetBox.max.z - offsetBox.min.z + 1),
    matchedVoxels: 0,
    matchedRate: 0.0,
    fillLineCalled: 0,
    maxStackLength: 0,
    procTime: 0
  };
  report._start();

  const stack: Vector3[] = [startPoint];
  const { min, max } = offsetBox;
  const { marks, marked } = bufferMarker(offsetBox);
  // const { marks, marked } = stupidMarker();
  // const { marks, marked } = objectMarker();
  // const { marks, marked } = bitsMarker(offsetBox);

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

  while (stack.length > 0) {
    report.maxStackLength = Math.max(report.maxStackLength, stack.length);
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

    // process the line
    report.fillLineCalled++;
    report.matchedVoxels += right.x - left.x + 1;
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

  report._finish();
  return report;
}
