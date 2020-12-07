import { Box } from '../common/geometry';
import RawData from '../common/RawData';
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
  snap: boolean = false
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

  if (volume.getPixelFormat() === 'binary') {
    if (snap) {
      result.size[0] = Math.ceil(result.size[0] / 8) * 8;
    }
    if (result.size[0] * result.size[1] < 8) {
      result.size[0] = Math.max(3, result.size[0]);
      result.size[1] = Math.max(3, result.size[1]);
    }
  }
  return result;
}

/**
 * Apply specified closure for all voxels on the line segment
 * which is defined by two points.
 * Voxels are processed when the line only "glances" them.
 */
export function processVoxelsOnLine(
  start: Vector3, // offset (not mm!)
  end: Vector3, // offset (not mm!)
  process: (point: Vector3) => void
): void {
  const grid = 1;
  const ray = new Vector3().subVectors(end, start);

  const currentVoxel = new Vector3(
    Math.floor(start.x / grid),
    Math.floor(start.y / grid),
    Math.floor(start.z / grid)
  );

  const lastVoxel = new Vector3(
    Math.floor(end.x / grid),
    Math.floor(end.y / grid),
    Math.floor(end.z / grid)
  );

  const step = new Vector3(
    ray.x < 0 ? -1 : 1,
    ray.y < 0 ? -1 : 1,
    ray.z < 0 ? -1 : 1
  );

  const nextVoxelBoundary = new Vector3(
    (currentVoxel.x + step.x) * grid,
    (currentVoxel.y + step.y) * grid,
    (currentVoxel.z + step.z) * grid
  );

  const delta = new Vector3(
    ray.x != 0 ? (grid / ray.x) * step.x : Number.POSITIVE_INFINITY,
    ray.y != 0 ? (grid / ray.y) * step.y : Number.POSITIVE_INFINITY,
    ray.z != 0 ? (grid / ray.z) * step.z : Number.POSITIVE_INFINITY
  );

  const t = new Vector3(
    ray.x != 0
      ? (nextVoxelBoundary.x - start.x) / ray.x
      : Number.POSITIVE_INFINITY,
    ray.y != 0
      ? (nextVoxelBoundary.y - start.y) / ray.y
      : Number.POSITIVE_INFINITY,
    ray.z != 0
      ? (nextVoxelBoundary.z - start.z) / ray.z
      : Number.POSITIVE_INFINITY
  );

  process(currentVoxel);

  while (!lastVoxel.equals(currentVoxel)) {
    if (t.x < t.y) {
      if (t.x < t.z) {
        currentVoxel.x += step.x;
        t.x += delta.x;
      } else {
        currentVoxel.z += step.z;
        t.z += delta.z;
      }
    } else {
      if (t.y < t.z) {
        currentVoxel.y += step.y;
        t.y += delta.y;
      } else {
        currentVoxel.z += step.z;
        t.z += delta.z;
      }
    }

    process(currentVoxel);
  }
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
