import { Box } from '../common/geometry';
import RawData from '../common/RawData';
import { PixelFormat } from '../common/PixelFormat';
import floodFill, { BinaryArrayView2D } from './util/floodFill';
import { OrientationString } from './section-util';
import { Vector3, Vector2 } from 'three';

/**
 * Scans all the voxels in the given volume and
 * determines the minimum bounding box that contains all the non-zero voxels.
 * @param volume The volume to scan over.
 * @param snap If this is set true and the volume is in binary format,
 *    the x-size will be normalized to the multiple of 8.
 * @return The bounding box measured in the given volume's coordinate.
 */
export function scanBoundingBox(
  volume: RawData,
  snap: boolean = true
): Box | null {
  // TODO: Optimization!
  const [rx, ry, rz] = volume.getDimension();
  let minX = rx,
    maxX = -1;
  let minY = ry,
    maxY = -1;
  let minZ = rz,
    maxZ = -1;
  let val: number;
  for (let z = 0; z < rz; z++) {
    for (let y = 0; y < ry; y++) {
      for (let x = 0; x < rx; x++) {
        val = volume.getPixelAt(x, y, z);
        if (val !== 0) {
          if (minX > x) minX = x;
          if (maxX < x) maxX = x;
          if (minY > y) minY = y;
          if (maxY < y) maxY = y;
          if (minZ > z) minZ = z;
          if (maxZ < z) maxZ = z;
        }
      }
    }
  }

  if (maxX === -1) return null;

  const result: Box = {
    origin: [minX, minY, minZ],
    size: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1]
  };

  if (snap && volume.getPixelFormat() === 'binary') {
    result.size[0] = Math.ceil(result.size[0] / 8) * 8;
  }

  return result;
}

/**
 * Fill all voxels with the given value when it intersects with the line segment
 * specified by the two points.
 * Voxels are filled when the line only "glances" them.
 * TODO: Introduce edge-overflow detection for all directions to reduce unnecessary calls to writePixelAt
 */
export function draw3DLine(
  volume: RawData,
  p0: Vector3, // offset (not mm!)
  p1: Vector3, // offset (not mm!)
  value: number = 1
): void {
  if (volume.getPixelFormat() !== 'binary') {
    throw new Error('This function only supports binary format.');
  }

  const diff = new Vector3().subVectors(p1, p0);
  const distance = diff.length();
  const e = diff.normalize();
  let walked = 0.0;

  const pi = p0.clone(); // clone

  type Trimmer = (i: number) => number;
  const trim_x: Trimmer =
    e.x < 0
      ? i => {
          return i === Math.floor(i) ? i - 1 : Math.floor(i);
        }
      : i => Math.floor(i);
  const trim_y: Trimmer =
    e.y < 0
      ? i => {
          return i === Math.floor(i) ? i - 1 : Math.floor(i);
        }
      : i => Math.floor(i);
  const trim_z: Trimmer =
    e.z < 0
      ? i => {
          return i === Math.floor(i) ? i - 1 : Math.floor(i);
        }
      : i => Math.floor(i);

  do {
    volume.writePixelAt(value, trim_x(pi.x), trim_y(pi.y), trim_z(pi.z));
    const step = getStepToNeighbor(pi, e);
    pi.add(step);
    walked += step.length();
  } while (walked < distance);

  volume.writePixelAt(
    value,
    Math.floor(p1.x),
    Math.floor(p1.y),
    Math.floor(p1.z)
  );
}

/**
 * Calculates the nearest voxel, starting from the `pos`, and in the direction specified by `e`.
 * @param pos The starting point from which the calculation is done.
 * @param e An unit vector that represents the direction.
 * @return neighbor pos.
 * TODO: this function may be slow due to the use of reduce.
 */
function getStepToNeighbor(pos: Vector3, e: Vector3): Vector3 {
  const stepLengthEntry: number[] = [
    nextLatticeDistance(pos.x, e.x),
    nextLatticeDistance(pos.y, e.y),
    nextLatticeDistance(pos.z, e.z)
  ].filter(i => i !== null) as number[];

  const stepLength = stepLengthEntry.reduce((prev, cur) => {
    return cur === null ? prev : prev < cur ? prev : cur;
  }, Number.POSITIVE_INFINITY);

  // console.log( stepLength.toString() + ' / ' + vec3.str( stepLengthEntry) );
  return new Vector3(e.x * stepLength, e.y * stepLength, e.z * stepLength);
}

/**
 * Calculates the 1/distance to the next lattice point. (one dimensional)
 * @param p starting point
 * @param u the direction
 */
function nextLatticeDistance(p: number, u: number): number | null {
  if (u === 0) return null;
  const i = u < 0 ? Math.floor(p) : Math.ceil(p);
  if (p === i) return Math.abs(1 / u);

  return Math.abs((p - i) / u);
}

/**
 * Performs a flood-fill on a given orthogonal MPR section of the volume.
 * @param volume The target volume to fill.
 * @param center The starting point to start filling.
 * @param orientation The orientation of the orthogonal MPR section.
 * @return The number of voxels affected (filled).
 */
export function floodFillOnSlice(
  volume: RawData,
  center: Vector3,
  orientation: OrientationString
): number {
  let view: BinaryArrayView2D;
  let start: Vector2;
  const dim = volume.getDimension();

  // Prepares something like a 2D DataView on the volume.
  if (orientation === 'axial') {
    view = {
      width: dim[0],
      height: dim[1],
      get: pos => volume.getPixelAt(pos.x, pos.y, center.z) > 0,
      set: (val, pos) =>
        volume.writePixelAt(val ? 1 : 0, pos.x, pos.y, center.z)
    };
    start = new Vector2(center.x, center.y);
  } else if (orientation === 'sagittal') {
    view = {
      width: dim[1],
      height: dim[2],
      get: pos => volume.getPixelAt(center.x, pos.x, pos.y) > 0,
      set: (val, pos) =>
        volume.writePixelAt(val ? 1 : 0, center.x, pos.x, pos.y)
    };
    start = new Vector2(center.y, center.z);
  } else if (orientation === 'coronal') {
    view = {
      width: dim[1],
      height: dim[2],
      get: pos => volume.getPixelAt(pos.x, center.y, pos.y) > 0,
      set: (val, pos) =>
        volume.writePixelAt(val ? 1 : 0, pos.x, center.y, pos.y)
    };
    start = new Vector2(center.x, center.z);
  } else {
    throw new TypeError('Invalid orientation');
  }

  // Applies the generic flood-fill function on a volume
  const filledPixels = floodFill(view, start);
  return filledPixels;
}
