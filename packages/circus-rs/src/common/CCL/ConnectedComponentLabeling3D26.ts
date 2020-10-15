import { dirxml } from 'console';
import { resolve } from 'path';

export interface LabelingResults {
  labelMap: Uint8Array;
  labelnum: number;
  labels: Array<{
    volume: number;
    min: [number, number, number];
    max: [number, number, number];
  }>;
}

/**
 * 何立風, et al. "三次元 2 値画像における高速ラベル付けアルゴリズム." 電子情報通信学会論文誌 D 92.12 (2009): 2261-2269.
 * Return Connected-component labeling image
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param NSlice slice number of array
 * @param neighbors 6 | 26
 * @param threshold voxel value of threshold
 */
export default function CCL(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  NSlice: number,
  threshold = 0
): LabelingResults {
  const [dx, dy, dz] = [
    [-1, -1, 0, 1, -1, 0, 1, -1, 0, 1, -1, 0, 1],
    [0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  ];
  const num_maxCCL = 2 ** 8;
  const chiefLabelTable = new Uint8Array(num_maxCCL);
  const substituteLabels = new Uint8Array(num_maxCCL ** 2);

  const resolve = (label1: number, label2: number) => {
    if (chiefLabelTable[label1] === chiefLabelTable[label2]) {
      return;
    }
    if (chiefLabelTable[label1] > chiefLabelTable[label2]) {
      [label1, label2] = [label2, label1];
    }
    const chiefLabel = chiefLabelTable[label1];
    const _chiefLabel = chiefLabelTable[label2];

    for (let i = 1; i <= substituteLabels[_chiefLabel * num_maxCCL]; i++) {
      substituteLabels[
        chiefLabel * num_maxCCL + substituteLabels[chiefLabel * num_maxCCL] + i
      ] = substituteLabels[_chiefLabel * num_maxCCL + i];
      chiefLabelTable[
        substituteLabels[_chiefLabel * num_maxCCL + i]
      ] = chiefLabel;
    }
    substituteLabels[chiefLabel * num_maxCCL] +=
      substituteLabels[_chiefLabel * num_maxCCL];

    substituteLabels[_chiefLabel * num_maxCCL] = 0;
  };

  const setNewLabel = (label: number) => {
    chiefLabelTable[label] = label;
    substituteLabels[label * num_maxCCL + 1] = label;
    substituteLabels[label * num_maxCCL] = 1;
  };

  const val0 = (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || NSlice <= z
      ? -1
      : array[x + width * (y + z * height)];
  };

  const labelImg = new Uint8Array(width * height * NSlice);

  const val = (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || NSlice <= z
      ? -1
      : labelImg[x + width * (y + z * height)];
  };

  let label = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (val0(i, j, k) <= threshold) {
          continue;
        }
        if (val(i + dx[8], j + dy[8], k + dz[8]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[8],
            j + dy[8],
            k + dz[8]
          );
        } else if (val(i + dx[2], j + dy[2], k + dz[2]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[2],
            j + dy[2],
            k + dz[2]
          );
          if (
            val(i + dx[11], j + dy[11], k + dz[11]) > 0 &&
            val(i + dx[7], j + dy[7], k + dz[7]) <= 0 &&
            val(i + dx[9], j + dy[9], k + dz[9]) <= 0
          ) {
            resolve(
              val(i + dx[2], j + dy[2], k + dz[2]),
              val(i + dx[11], j + dy[11], k + dz[11])
            );
          } else {
            if (
              val(i + dx[10], j + dy[10], k + dz[10]) > 0 &&
              val(i + dx[7], j + dy[7], k + dz[7]) <= 0
            ) {
              resolve(
                val(i + dx[2], j + dy[2], k + dz[2]),
                val(i + dx[10], j + dy[10], k + dz[10])
              );
            }
            if (
              val(i + dx[12], j + dy[12], k + dz[12]) > 0 &&
              val(i + dx[9], j + dy[9], k + dz[9]) <= 0
            ) {
              resolve(
                val(i + dx[2], j + dy[2], k + dz[2]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          }
        } else if (val(i + dx[5], j + dy[5], k + dz[5]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[5],
            j + dy[5],
            k + dz[5]
          );
          if (
            val(i + dx[11], j + dy[11], k + dz[11]) > 0 &&
            val(i + dx[7], j + dy[7], k + dz[7]) <= 0 &&
            val(i + dx[9], j + dy[9], k + dz[9]) <= 0
          ) {
            resolve(
              val(i + dx[5], j + dy[5], k + dz[5]),
              val(i + dx[11], j + dy[11], k + dz[11])
            );
          } else {
            if (
              val(i + dx[10], j + dy[10], k + dz[10]) > 0 &&
              val(i + dx[7], j + dy[7], k + dz[7]) <= 0
            ) {
              resolve(
                val(i + dx[5], j + dy[5], k + dz[5]),
                val(i + dx[10], j + dy[10], k + dz[10])
              );
            }
            if (
              val(i + dx[12], j + dy[12], k + dz[12]) > 0 &&
              val(i + dx[9], j + dy[9], k + dz[9]) <= 0
            ) {
              resolve(
                val(i + dx[5], j + dy[5], k + dz[5]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          }
        } else if (val(i + dx[0], j + dy[0], k + dz[0]) > 0) {
          labelImg[i + j * width + k * width * height] = val(
            i + dx[0],
            j + dy[0],
            k + dz[0]
          );
          if (
            val(i + dx[9], j + dy[9], k + dz[9]) > 0 &&
            val(i + dx[11], j + dy[11], k + dz[11]) <= 0
          ) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[9], j + dy[9], k + dz[9])
            );
          } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[6], j + dy[6], k + dz[6])
            );
            if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
              resolve(
                val(i + dx[0], j + dy[0], k + dz[0]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          } else if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[3], j + dy[3], k + dz[3])
            );
            if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
              resolve(
                val(i + dx[0], j + dy[0], k + dz[0]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          } else if (
            val(i + dx[12], j + dy[12], k + dz[12]) > 0 &&
            val(i + dx[11], j + dy[11], k + dz[11]) <= 0
          ) {
            resolve(
              val(i + dx[0], j + dy[0], k + dz[0]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[7], j + dy[7], k + dz[7]) > 0) {
          labelImg[i + j * width + k * width * height] = val(
            i + dx[7],
            j + dy[7],
            k + dz[7]
          );
          if (
            val(i + dx[9], j + dy[9], k + dz[9]) > 0 &&
            val(i + dx[11], j + dy[11], k + dz[11]) <= 0
          ) {
            resolve(
              val(i + dx[7], j + dy[7], k + dz[7]),
              val(i + dx[9], j + dy[9], k + dz[9])
            );
          } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
            resolve(
              val(i + dx[7], j + dy[7], k + dz[7]),
              val(i + dx[6], j + dy[6], k + dz[6])
            );
            if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
              resolve(
                val(i + dx[7], j + dy[7], k + dz[7]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          } else if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
            resolve(
              val(i + dx[7], j + dy[7], k + dz[7]),
              val(i + dx[3], j + dy[3], k + dz[3])
            );
            if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
              resolve(
                val(i + dx[7], j + dy[7], k + dz[7]),
                val(i + dx[12], j + dy[12], k + dz[12])
              );
            }
          } else if (
            val(i + dx[12], j + dy[12], k + dz[12]) > 0 &&
            val(i + dx[11], j + dy[11], k + dz[11]) <= 0
          ) {
            resolve(
              val(i + dx[7], j + dy[7], k + dz[7]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[9], j + dy[9], k + dz[9]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[9],
            j + dy[9],
            k + dz[9]
          );
          if (
            val(i + dx[10], j + dy[10], k + dz[10]) > 0 &&
            val(i + dx[11], j + dy[11], k + dz[11]) <= 0
          ) {
            resolve(
              val(i + dx[9], j + dy[9], k + dz[9]),
              val(i + dx[10], j + dy[10], k + dz[10])
            );
          }
          if (val(i + dx[4], j + dy[4], k + dz[4]) > 0) {
            resolve(
              val(i + dx[9], j + dy[9], k + dz[9]),
              val(i + dx[4], j + dy[4], k + dz[4])
            );
          } else if (val(i + dx[1], j + dy[1], k + dz[1]) > 0) {
            resolve(
              val(i + dx[9], j + dy[9], k + dz[9]),
              val(i + dx[1], j + dy[1], k + dz[1])
            );
          }
        } else if (val(i + dx[11], j + dy[11], k + dz[11]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[11],
            j + dy[11],
            k + dz[11]
          );
          if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
            resolve(
              val(i + dx[11], j + dy[11], k + dz[11]),
              val(i + dx[3], j + dy[3], k + dz[3])
            );
          } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
            resolve(
              val(i + dx[11], j + dy[11], k + dz[11]),
              val(i + dx[6], j + dy[6], k + dz[6])
            );
          }
          if (val(i + dx[1], j + dy[1], k + dz[1]) > 0) {
            resolve(
              val(i + dx[11], j + dy[11], k + dz[11]),
              val(i + dx[1], j + dy[1], k + dz[1])
            );
          } else if (val(i + dx[4], j + dy[4], k + dz[4]) > 0) {
            resolve(
              val(i + dx[11], j + dy[11], k + dz[11]),
              val(i + dx[4], j + dy[4], k + dz[4])
            );
          }
        } else if (val(i + dx[4], j + dy[4], k + dz[4]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[4],
            j + dy[4],
            k + dz[4]
          );
          if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
            resolve(
              val(i + dx[4], j + dy[4], k + dz[4]),
              val(i + dx[3], j + dy[3], k + dz[3])
            );
          } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
            resolve(
              val(i + dx[4], j + dy[4], k + dz[4]),
              val(i + dx[6], j + dy[6], k + dz[6])
            );
          }
          if (val(i + dx[10], j + dy[10], k + dz[10]) > 0) {
            resolve(
              val(i + dx[4], j + dy[4], k + dz[4]),
              val(i + dx[10], j + dy[10], k + dz[10])
            );
          }
          if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
            resolve(
              val(i + dx[4], j + dy[4], k + dz[4]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[1], j + dy[1], k + dz[1]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[1],
            j + dy[1],
            k + dz[1]
          );
          if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
            resolve(
              val(i + dx[1], j + dy[1], k + dz[1]),
              val(i + dx[3], j + dy[3], k + dz[3])
            );
          } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
            resolve(
              val(i + dx[1], j + dy[1], k + dz[1]),
              val(i + dx[6], j + dy[6], k + dz[6])
            );
          }
          if (val(i + dx[10], j + dy[10], k + dz[10]) > 0) {
            resolve(
              val(i + dx[1], j + dy[1], k + dz[1]),
              val(i + dx[10], j + dy[10], k + dz[10])
            );
          }
          if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
            resolve(
              val(i + dx[1], j + dy[1], k + dz[1]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[3], j + dy[3], k + dz[3]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[3],
            j + dy[3],
            k + dz[3]
          );
          if (val(i + dx[10], j + dy[10], k + dz[10]) > 0) {
            resolve(
              val(i + dx[3], j + dy[3], k + dz[3]),
              val(i + dx[10], j + dy[10], k + dz[10])
            );
          }
          if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
            resolve(
              val(i + dx[3], j + dy[3], k + dz[3]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[6], j + dy[6], k + dz[6]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[6],
            j + dy[6],
            k + dz[6]
          );
          if (val(i + dx[10], j + dy[10], k + dz[10]) > 0) {
            resolve(
              val(i + dx[6], j + dy[6], k + dz[6]),
              val(i + dx[10], j + dy[10], k + dz[10])
            );
          }
          if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
            resolve(
              val(i + dx[6], j + dy[6], k + dz[6]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[10], j + dy[10], k + dz[10]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[10],
            j + dy[10],
            k + dz[10]
          );
          if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
            resolve(
              val(i + dx[10], j + dy[10], k + dz[10]),
              val(i + dx[12], j + dy[12], k + dz[12])
            );
          }
        } else if (val(i + dx[12], j + dy[12], k + dz[12]) > 0) {
          labelImg[i + width * (j + k * height)] = val(
            i + dx[12],
            j + dy[12],
            k + dz[12]
          );
        } else {
          ++label;
          if (num_maxCCL <= label) {
            throw new Error(`number of tentative label is not in 8 bit.`);
          }
          labelImg[i + width * (j + k * height)] = label;
          setNewLabel(label);
        }
      }
    }
  }

  let newLabel = 0;

  for (let i = 1; i < num_maxCCL; i++) {
    if (substituteLabels[i * num_maxCCL] != 0) {
      newLabel++;
      for (
        let j = i * num_maxCCL + 1;
        j <= i * num_maxCCL + substituteLabels[i * num_maxCCL];
        j++
      ) {
        chiefLabelTable[substituteLabels[j]] = newLabel;
      }
    }
  }
  const volume = new Uint32Array(newLabel + 1);
  const max =
    width < height
      ? height < NSlice
        ? NSlice
        : height
      : width < NSlice
      ? NSlice
      : width;
  const UL = new Uint16Array((newLabel + 1) * 3).map(() => max);
  const LR = new Uint16Array((newLabel + 1) * 3);

  for (let k = 0; k < NSlice; k++) {
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

  const labels = new Array(newLabel + 1);
  for (let i = 0; i <= newLabel; i++) {
    const pos = [i * 3, i * 3 + 1, i * 3 + 2];
    labels[i] = {
      volume: volume[i],
      min: [UL[pos[0]], UL[pos[1]], UL[pos[2]]],
      max: [LR[pos[0]], LR[pos[1]], LR[pos[2]]]
    };
  }

  return { labelMap: labelImg, labelnum: newLabel, labels: labels };
}
