import { TypedArray } from 'three';
import { CCL3D } from './ccl-types';

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 * @param bufferSize max number of labels, must be < 2**16
 * @param threshold voxel value of threshold
 */
const CCL: CCL3D = (
  array,
  width,
  height,
  nSlices,
  bufferSize = 10000,
  threshold = 0
) => {
  if (2 ** 16 <= bufferSize) {
    throw new Error(`Max number of tentative labels must be less than 2**16.`);
  }
  const [dx, dy, dz] = [
    [0, -1, 0],
    [0, 0, -1],
    [-1, 0, 0]
  ];
  const chiefLabelTable: TypedArray =
    bufferSize < 2 ** 8
      ? new Uint8Array(bufferSize)
      : new Uint16Array(bufferSize);
  const substituteLabels: TypedArray =
    bufferSize < 2 ** 8
      ? new Uint8Array(bufferSize ** 2)
      : new Uint16Array(bufferSize ** 2);

  const resolve = (label1: number, label2: number) => {
    if (chiefLabelTable[label1] === chiefLabelTable[label2]) {
      return;
    }
    if (chiefLabelTable[label1] > chiefLabelTable[label2]) {
      [label1, label2] = [label2, label1];
    }
    const chiefLabel = chiefLabelTable[label1];
    const _chiefLabel = chiefLabelTable[label2];

    for (let i = 1; i <= substituteLabels[_chiefLabel * bufferSize]; i++) {
      substituteLabels[
        chiefLabel * bufferSize + substituteLabels[chiefLabel * bufferSize] + i
      ] = substituteLabels[_chiefLabel * bufferSize + i];
      chiefLabelTable[substituteLabels[_chiefLabel * bufferSize + i]] =
        chiefLabel;
    }
    substituteLabels[chiefLabel * bufferSize] +=
      substituteLabels[_chiefLabel * bufferSize];

    substituteLabels[_chiefLabel * bufferSize] = 0;
  };

  const setNewLabel = (label: number) => {
    chiefLabelTable[label] = label;
    substituteLabels[label * bufferSize + 1] = label;
    substituteLabels[label * bufferSize] = 1;
  };

  const val0 = (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || nSlices <= z
      ? -1
      : array[x + width * (y + z * height)];
  };

  const labelImg =
    bufferSize < 2 ** 8
      ? new Uint8Array(width * height * nSlices)
      : new Uint16Array(width * height * nSlices);

  const val = (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || nSlices <= z
      ? -1
      : labelImg[x + width * (y + z * height)];
  };

  let label = 0;
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (val0(i, j, k) <= threshold) {
          continue;
        }
        if (val(i + dx[0], j + dy[0], k + dz[0]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[0],
            j + dy[0],
            k + dz[0]
          );
          if (val(i + dx[1], j + dy[1], k + dz[1]) > 0) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[1], j + dy[1], k + dz[1])
            );
          }
          if (val(i + dx[2], j + dy[2], k + dz[2]) > 0) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[2], j + dy[2], k + dz[2])
            );
          }
        } else if (val(i + dx[1], j + dy[1], k + dz[1]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[1],
            j + dy[1],
            k + dz[1]
          );
          if (val(i + dx[2], j + dy[2], k + dz[2]) > 0) {
            resolve(
              val(i + dx[1], j + dy[1], k + dz[1]),
              val(i + dx[2], j + dy[2], k + dz[2])
            );
          }
        } else if (val(i + dx[2], j + dy[2], k + dz[2]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[2],
            j + dy[2],
            k + dz[2]
          );
        } else {
          ++label;
          if (bufferSize <= label) {
            throw new Error(
              `Number of tentative labels exceeded the limit ${bufferSize}.`
            );
          }
          labelImg[i + width * (j + k * height)] = label;
          setNewLabel(label);
        }
      }
    }
  }

  let labelCount = 0;

  for (let i = 1; i < bufferSize; i++) {
    if (substituteLabels[i * bufferSize] != 0) {
      labelCount++;
      for (
        let j = i * bufferSize + 1;
        j <= i * bufferSize + substituteLabels[i * bufferSize];
        j++
      ) {
        chiefLabelTable[substituteLabels[j]] = labelCount;
      }
    }
  }
  const volume = new Uint32Array(labelCount + 1);
  const max =
    width < height
      ? height < nSlices
        ? nSlices
        : height
      : width < nSlices
        ? nSlices
        : width;
  const UL = new Uint16Array((labelCount + 1) * 3).map(() => max);
  const LR = new Uint16Array((labelCount + 1) * 3);

  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + width * (j + k * height);
        const labeltmp = chiefLabelTable[labelImg[pos]];
        const labeltmp3 = labeltmp * 3;
        labelImg[pos] = labeltmp;
        //labeltmp
        if (i < UL[labeltmp3]) {
          UL[labeltmp3] = i;
        }
        if (LR[labeltmp3] < i) {
          LR[labeltmp3] = i;
        }
        if (j < UL[labeltmp3 + 1]) {
          UL[labeltmp3 + 1] = j;
        }
        if (LR[labeltmp3 + 1] < j) {
          LR[labeltmp3 + 1] = j;
        }
        if (k < UL[labeltmp3 + 2]) {
          UL[labeltmp3 + 2] = k;
        }
        if (LR[labeltmp3 + 2] < k) {
          LR[labeltmp3 + 2] = k;
        }

        volume[labeltmp]++;
      }
    }
  }

  const labels = new Array(labelCount + 1);
  for (let i = 0; i <= labelCount; i++) {
    const pos = [i * 3, i * 3 + 1, i * 3 + 2];
    labels[i] = {
      volume: volume[i],
      min: [UL[pos[0]], UL[pos[1]], UL[pos[2]]],
      max: [LR[pos[0]], LR[pos[1]], LR[pos[2]]]
    };
  }

  return { labelMap: labelImg, labelNum: labelCount, labels };
};

export default CCL;
