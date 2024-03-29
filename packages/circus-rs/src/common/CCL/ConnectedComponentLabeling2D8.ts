import { TypedArray } from 'three';
import { CCL2D } from './ccl-types';

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param bufferSize max number of labels, must be < 2**16
 * @param threshold voxel value of threshold
 */
const CCL: CCL2D = (
  array,
  width,
  height,
  bufferSize = 10000,
  threshold = 0
) => {
  if (2 ** 16 <= bufferSize) {
    throw new Error(`Max number of tentative labels must be less than 2**16.`);
  }
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

  const val0 = (x: number, y: number) => {
    return x < 0 || width <= x || y < 0 || height <= y
      ? -1
      : array[x + width * y];
  };
  const labelImg =
    bufferSize < 2 ** 8
      ? new Uint8Array(width * height)
      : new Uint16Array(width * height);

  const val = (x: number, y: number) => {
    return x < 0 || width <= x || y < 0 || height <= y
      ? -1
      : labelImg[x + width * y];
  };
  let label = 0;

  for (let j = 0; j < height; j += 2) {
    for (let i = 0; i < width; i++) {
      if (val0(i, j) > threshold) {
        if (val(i - 1, j) <= 0) {
          if (val(i - 1, j + 1) > 0) {
            labelImg[i + j * width] = val(i - 1, j + 1);
            if (val(i, j - 1) > 0) {
              resolve(val(i - 1, j + 1), val(i, j - 1));
            } else {
              if (val(i - 1, j - 1) > 0) {
                resolve(val(i - 1, j + 1), val(i - 1, j - 1));
              }
              if (val(i + 1, j - 1) > 0) {
                resolve(val(i - 1, j + 1), val(i + 1, j - 1));
              }
            }
          } else if (val(i, j - 1) > 0) {
            labelImg[i + j * width] = val(i, j - 1);
          } else if (val(i - 1, j - 1) > 0) {
            labelImg[i + j * width] = val(i - 1, j - 1);
            if (val(i + 1, j - 1) > 0) {
              resolve(val(i - 1, j - 1), val(i + 1, j - 1));
            }
          } else if (val(i + 1, j - 1) > 0) {
            labelImg[i + j * width] = val(i + 1, j - 1);
          } else {
            ++label;
            if (bufferSize <= label) {
              throw new Error(
                `Number of tentative labels exceeded the limit ${bufferSize}.`
              );
            }
            labelImg[i + j * width] = label;
            setNewLabel(label);
          }
        } else {
          labelImg[i + j * width] = val(i - 1, j);
          if (val(i, j - 1) <= 0 && 0 < val(i + 1, j - 1)) {
            resolve(val(i - 1, j), val(i + 1, j - 1));
          }
        }
        if (val0(i, j + 1) > threshold) {
          labelImg[i + (j + 1) * width] = labelImg[i + j * width];
        }
      } else if (val0(i, j + 1) > threshold) {
        if (val(i - 1, j) > 0) {
          labelImg[i + (j + 1) * width] = val(i - 1, j);
        } else if (val(i - 1, j + 1) > 0) {
          labelImg[i + (j + 1) * width] = val(i - 1, j + 1);
        } else {
          ++label;
          if (bufferSize <= label) {
            throw new Error(
              `Number of tentative labels exceeded the limit ${bufferSize}.`
            );
          }
          labelImg[i + (j + 1) * width] = label;
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
  const max = width < height ? height : width;
  const UL = new Uint16Array((labelCount + 1) * 2).map(() => max);
  const LR = new Uint16Array((labelCount + 1) * 2);

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const pos = i + width * j;
      const labeltmp = chiefLabelTable[labelImg[pos]];
      const labeltmp2 = labeltmp * 2;
      labelImg[pos] = labeltmp;
      //labeltmp
      if (i < UL[labeltmp2]) {
        UL[labeltmp2] = i;
      }
      if (LR[labeltmp2] < i) {
        LR[labeltmp2] = i;
      }
      if (j < UL[labeltmp2 + 1]) {
        UL[labeltmp2 + 1] = j;
      }
      if (LR[labeltmp2 + 1] < j) {
        LR[labeltmp2 + 1] = j;
      }
      volume[labeltmp]++;
    }
  }

  const labels = new Array(labelCount + 1);
  for (let i = 0; i <= labelCount; i++) {
    const pos = [i * 2, i * 2 + 1];
    labels[i] = {
      volume: volume[i],
      min: [UL[pos[0]], UL[pos[1]]],
      max: [LR[pos[0]], LR[pos[1]]]
    };
  }
  return { labelMap: labelImg, labelNum: labelCount, labels };
};

export default CCL;
