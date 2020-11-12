import { RawData, Vector3D } from '..';

export default function fuzzySelect(
  volume: RawData,
  startPoint: Vector3D, // index (not mm!)
  maxDistance: Vector3D, // index (not mm!)
  threshold: number
): RawData {
  const specifiedPixel = volume.getPixelAt(
    startPoint[0],
    startPoint[1],
    startPoint[2]
  );

  const minPixel = specifiedPixel - threshold;
  const maxPixel = specifiedPixel + threshold;
  const select = (x: number, y: number, z: number): boolean => {
    const pixel = volume.getPixelAt(x, y, z);
    return minPixel <= pixel && pixel <= maxPixel;
  };

  //TODO: Improve to select only approximate pixels within a continuous range
  const maxSize = volume.getDimension();
  const offset = startPoint.map((v, i) => Math.max(0, v - maxDistance[i]));

  const size = offset.map((v, i) =>
    Math.min(maxSize[i], v + 1 + maxDistance[i] * 2)
  ) as Vector3D;

  const _size =
    size[0] % 8 === 0
      ? size
      : ([
          Math.min(maxSize[0], Math.ceil(size[0] / 8) * 8),
          size[1],
          size[2]
        ] as Vector3D);

  const rawData = new RawData(_size, 'binary');
  const [xmin, ymin, zmin] = offset;
  const [xmax, ymax, zmax] = offset.map((v, i) => v + size[i]);
  for (let z = zmin; z < zmax; z++) {
    for (let y = ymin; y < ymax; y++) {
      for (let x = xmin; x < xmax; x++) {
        if (select(x, y, z)) {
          rawData.writePixelAt(1, x - offset[0], y - offset[1], z - offset[2]);
        }
      }
    }
  }
  return rawData;
}
