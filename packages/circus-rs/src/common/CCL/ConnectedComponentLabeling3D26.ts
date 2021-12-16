import { TypedArray } from 'three';
import { CCL3D } from './ccl-types';
/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 * @param maxComponents max number of label < 2**16
 * @param threshold voxel value of threshold
 */
const CCL: CCL3D = (
  array,
  width,
  height,
  nSlices,
  maxComponents = 10000,
  threshold = 0
) => {
  if (2 ** 16 <= maxComponents) {
    throw new Error(`max number of tentative label is less than 2**16.`);
  }
  const [dx, dy, dz] = [
    [-1, -1, 0, 1, -1, 0, 1, -1, 0, 1, -1, 0, 1],
    [0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  ];
  const chiefLabelTable: TypedArray =
    maxComponents < 2 ** 8
      ? new Uint8Array(maxComponents)
      : new Uint16Array(maxComponents);
  const substituteLabels: TypedArray =
    maxComponents < 2 ** 8
      ? new Uint8Array(maxComponents ** 2)
      : new Uint16Array(maxComponents ** 2);

  const resolve = (label1: number, label2: number) => {
    if (chiefLabelTable[label1] === chiefLabelTable[label2]) {
      return;
    }
    if (chiefLabelTable[label1] > chiefLabelTable[label2]) {
      [label1, label2] = [label2, label1];
    }
    const chiefLabel = chiefLabelTable[label1];
    const _chiefLabel = chiefLabelTable[label2];

    for (let i = 1; i <= substituteLabels[_chiefLabel * maxComponents]; i++) {
      substituteLabels[
        chiefLabel * maxComponents +
          substituteLabels[chiefLabel * maxComponents] +
          i
      ] = substituteLabels[_chiefLabel * maxComponents + i];
      chiefLabelTable[substituteLabels[_chiefLabel * maxComponents + i]] =
        chiefLabel;
    }
    substituteLabels[chiefLabel * maxComponents] +=
      substituteLabels[_chiefLabel * maxComponents];

    substituteLabels[_chiefLabel * maxComponents] = 0;
  };

  const setNewLabel = (label: number) => {
    chiefLabelTable[label] = label;
    substituteLabels[label * maxComponents + 1] = label;
    substituteLabels[label * maxComponents] = 1;
  };

  const val0 = (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || nSlices <= z
      ? -1
      : array[x + width * (y + z * height)];
  };

  const labelImg =
    maxComponents < 2 ** 8
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
          if (maxComponents <= label) {
            throw new Error(
              `number of tentative label is not less than ${maxComponents}.`
            );
          }
          labelImg[i + width * (j + k * height)] = label;
          setNewLabel(label);
        }
      }
    }
  }

  let labelCount = 0;

  for (let i = 1; i < maxComponents; i++) {
    if (substituteLabels[i * maxComponents] != 0) {
      labelCount++;
      for (
        let j = i * maxComponents + 1;
        j <= i * maxComponents + substituteLabels[i * maxComponents];
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
