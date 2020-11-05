import { RawData, Vector3D } from '..';

export default function fuzzySelect(
  src: RawData,
  center: Vector3D
): RawData | undefined {
  const refVal = src.getPixelAt(...center);
  const size = src.getDimension();

  const check = (x: number, y: number, z: number) => {
    return (
      x >= 0 && y >= 0 && z >= 0 && x < size[0] && y < size[1] && z < size[2]
    );
  };

  const dst = new RawData(size, 'binary');

  const stack: Vector3D[] = [center];
  const done: Vector3D[] = [];
  while (stack.length > 0) {
    const cur = <Vector3D>stack.pop();
    const [x, y, z] = cur;
    dst.writePixelAt(1, x, y, z);
    const prev: Vector3D = [x - 1, y, z];
    const next: Vector3D = [x + 1, y, z];
    const east: Vector3D = [x, y + 1, z];
    const west: Vector3D = [x, y - 1, z];
    const north: Vector3D = [x, y, z - 1];
    const south: Vector3D = [x, y, z + 1];
    [prev, next, east, west, north, south].forEach(pos => {
      const [x, y, z] = pos;
      if (
        check(x, y, z) &&
        src.getPixelAt(x, y, z) === refVal &&
        !done.find(e => e.every((v, i) => v === pos[i]))
      ) {
        stack.push(pos);
      }
    });
    done.push(cur);
  }
  return dst;
}
