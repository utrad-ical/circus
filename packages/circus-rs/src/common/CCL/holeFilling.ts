import CCL3D6 from './ConnectedComponentLabeling3D6';
import CCL3D26 from './ConnectedComponentLabeling3D26';
import CCL2D4 from './ConnectedComponentLabeling2D4';
import CCL2D8 from './ConnectedComponentLabeling2D8';

type HoleFilling3D = (
  array: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  neighbor: number,
  bufferSize?: number
) => { result: Uint8Array; holeNum: number; holeVolume: number };

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 * @param neighbor neighbor of CCL
 * @param bufferSize max number of labels, must be < 2**16
 */
const HoleFilling2D: HoleFilling3D = (
  array,
  width,
  height,
  nSlices,
  neighbor,
  bufferSize = 10000
) => {
  let pos1 = 0;
  const result = array.slice();
  let holeNum = 0;
  let holeVolume = 0;
  const tmp = new Uint8Array((width + 2) * (height + 2)).map(() => 1);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        tmp[i + j * (width + 2)] = array[pos1++] === 0 ? 1 : 0;
      }
    }
    const hole =
      neighbor === 4
        ? CCL2D4(tmp, width + 2, height + 2, bufferSize)
        : CCL2D8(tmp, width + 2, height + 2, bufferSize);
    if (hole.labelNum === 1) continue;
    let pos2 = k * width * height;
    holeNum += hole.labelNum - 1;
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        if (1 < hole.labelMap[i + j * (width + 2)]) {
          result[pos2] = 1;
          holeVolume++;
        }
        pos2++;
      }
    }
  }

  return { result: result, holeNum: holeNum, holeVolume: holeVolume };
};

const HoleFilling3D: HoleFilling3D = (
  array,
  width,
  height,
  nSlices,
  neighbor,
  bufferSize = 10000
) => {
  let pos = 0;
  let holeNum = 0;
  let holeVolume = 0;
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
      ? CCL3D6(tmp, width + 2, height + 2, nSlices + 2, bufferSize)
      : CCL3D26(tmp, width + 2, height + 2, nSlices + 2, bufferSize);
  if (hole.labelNum === 1) {
    return { result: result, holeNum: holeNum, holeVolume: holeVolume };
  }
  holeNum = hole.labelNum - 1;
  pos = 0;
  for (let k = 1; k < nSlices + 1; k++) {
    for (let j = 1; j < height + 1; j++) {
      for (let i = 1; i < width + 1; i++) {
        if (
          1 <
          hole.labelMap[i + j * (width + 2) + k * (width + 2) * (height + 2)]
        ) {
          result[pos] = 1;
          holeVolume++;
        }
        pos++;
      }
    }
  }

  return { result: result, holeNum: holeNum, holeVolume: holeVolume };
};
export default HoleFilling2D;
export { HoleFilling3D };
