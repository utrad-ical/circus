import CCL3D6 from './ConnectedComponentLabeling3D6';
import CCL3D26 from './ConnectedComponentLabeling3D26';
import CCL2D4 from './ConnectedComponentLabeling2D4';
import CCL2D8 from './ConnectedComponentLabeling2D8';

type HoleFilling3D = (
  array: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  neighbor: number
) => Uint8Array;

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 * @param neighbor neighbor of CCL
 */
const HoleFilling2D: HoleFilling3D = (
  array,
  width,
  height,
  nSlices,
  neighbor
) => {
  let pos1 = 0;
  const result = array.slice();

  const tmp = new Uint8Array((width + 2) * (height + 2)).map(() => 1);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        tmp[i + j * (width + 2)] = array[pos1++] === 0 ? 1 : 0;
      }
    }
    const hole =
      neighbor === 4
        ? CCL2D4(tmp, width + 2, height + 2)
        : CCL2D8(tmp, width + 2, height + 2);
    if (hole.labelNum === 1) continue;
    let pos2 = k * width * height;
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        if (1 < hole.labelMap[i + j * (width + 2)]) {
          result[pos2] = 1;
        }
        pos2++;
      }
    }
  }

  return result;
};

const HoleFilling3D: HoleFilling3D = (
  array,
  width,
  height,
  nSlices,
  neighbor
) => {
  let pos = 0;
  const result = array.slice();

  const tmp = new Uint8Array((width + 2) * (height + 2) * (nSlices + 2)).map(
    () => 1
  );
  for (let k = 1; k < nSlices + 1; k++) {
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        tmp[i + j * (width + 2) + k * (width + 2) * (height + 2)] =
          array[pos++] === 0 ? 1 : 0;
      }
    }
  }

  const hole =
    neighbor === 6
      ? CCL3D6(tmp, width + 2, height + 2, nSlices + 2)
      : CCL3D26(tmp, width + 2, height + 2, nSlices + 2);
  if (hole.labelNum === 1) {
    return result;
  }
  pos = 0;
  for (let k = 1; k < nSlices + 1; k++) {
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        if (
          1 <
          hole.labelMap[i + j * (width + 2) + k * (width + 2) * (height + 2)]
        ) {
          result[pos] = 1;
        }
        pos++;
      }
    }
  }

  return result;
};
export default HoleFilling2D;
export { HoleFilling3D };
