import { Vector3, Box3 } from 'three';

export interface VoxelMarker {
  marked(p: Vector3): boolean;
  markVoxels(p1: Vector3, xLength?: number): void;
}

export default function voxelMarker(boundary: Box3): VoxelMarker {
  const { min } = boundary;
  const [width, height, depth] = boundary
    .getSize(new Vector3())
    .addScalar(1)
    .toArray();

  const buffer = new Uint8Array(Math.ceil((width * height * depth) / 8));

  const read = (pos: number) => (buffer[pos >> 3] >> (pos & 0x7)) & 1;
  const write = (pos: number) => (buffer[pos >> 3] |= 1 << (pos & 0x7));

  const markVoxels = (p: Vector3, xLength: number = 1) => {
    let offset =
      (p.z - min.z) * height * width + (p.y - min.y) * width + (p.x - min.x);
    for (let i = 0; i < xLength; i++) {
      write(offset++);
    }
  };

  const marked = (p: Vector3) => {
    const offset =
      (p.z - min.z) * height * width + (p.y - min.y) * width + (p.x - min.x);
    return read(offset) === 1;
  };

  return { marked, markVoxels };
}
