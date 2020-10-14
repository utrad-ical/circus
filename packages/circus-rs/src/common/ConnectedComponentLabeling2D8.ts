export interface LabelingResults {
  labelMap: Uint8Array;
  labelnum: number;
  labels: Array<{
    volume: number;
    min: [number, number];
    max: [number, number];
  }>;
}

/**
 * Return labeled image
 * 何立風, et al. "ラスタ走査型ラベル付けアルゴリズムにおける新しい第 1 走査手法." 情報処理学会論文誌: 論文誌ジャーナル 52.4 (2011): 1813-1819.
 * @param array: input binary image
 * @param width: width of array
 * @param height: height of array
 * @param threshold: voxel value of threshold
 */
export default function CCL(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  threshold = 0
): LabelingResults {
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

  const val0 = (x: number, y: number) => {
    return x < 0 || width <= x || y < 0 || height <= y
      ? -1
      : array[x + width * y];
  };
  const labelImg = new Uint8Array(width * height);

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
            if (num_maxCCL <= label) {
              throw new Error(`number of tentative label is not in 8 bit.`);
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
          if (num_maxCCL <= label) {
            throw new Error(`number of tentative label is not in 8 bit.`);
          }
          labelImg[i + (j + 1) * width] = label;
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
  const max = width < height ? height : width;
  const UL = new Uint16Array((newLabel + 1) * 2).map(() => max);
  const LR = new Uint16Array((newLabel + 1) * 2);

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

  const labels = new Array(newLabel + 1);
  for (let i = 0; i <= newLabel; i++) {
    const pos = [i * 2, i * 2 + 1];
    labels[i] = {
      volume: volume[i],
      min: [UL[pos[0]], UL[pos[1]]],
      max: [LR[pos[0]], LR[pos[1]]]
    };
  }
  return { labelMap: labelImg, labelnum: newLabel, labels: labels };
}

// function mosaic(
//   width: number,
//   height: number,
//   NSlice: number,
//   neightbor: 6 | 26
// ): [Uint8Array, Uint16Array, number, Uint32Array, Uint16Array, Uint16Array] {
//   const img = new Uint8Array(width * height * NSlice);
//   const label = new Uint16Array(width * height * NSlice);
//   const num = neightbor === 6 ? Math.floor((width * height * NSlice) / 2) : 1;
//   const volume = new Uint32Array(num + 1);
//   const UL = new Uint16Array((num + 1) * 3).map(() =>
//     width < height
//       ? height < NSlice
//         ? NSlice
//         : height
//       : width < NSlice
//       ? NSlice
//       : width
//   );
//   const LR = new Uint16Array(
//     (Math.floor((width * height * NSlice) / 2) + 1) * 3
//   );

//   let sum = 0;
//   for (let k = 0; k < NSlice; k++) {
//     for (let j = 0; j < height; j++) {
//       for (let i = 0; i < width; i++) {
//         const pos = i + width * (j + k * height);
//         if ((i % 2) + (j % 2) === 1) {
//           img[pos] = 1 - (k % 2);
//         } else {
//           img[pos] = k % 2;
//         }
//         label[pos] = img[pos] === 1 ? ++sum : 0;
//         if (num === 1) {
//           volume[img[pos]]++;
//           if (i < UL[img[pos] * 3]) {
//             UL[img[pos] * 3] = i;
//           }
//           if (LR[img[pos] * 3] < i) {
//             LR[img[pos] * 3] = i;
//           }
//           if (j < UL[img[pos] * 3 + 1]) {
//             UL[img[pos] * 3 + 1] = j;
//           }
//           if (LR[img[pos] * 3 + 1] < j) {
//             LR[img[pos] * 3 + 1] = j;
//           }
//           if (k < UL[img[pos] * 3 + 2]) {
//             UL[img[pos] * 3 + 2] = k;
//           }
//           if (LR[img[pos] * 3 + 2] < k) {
//             LR[img[pos] * 3 + 2] = k;
//           }
//         } else {
//           volume[label[pos]]++;
//           if (i < UL[label[pos] * 3]) {
//             UL[label[pos] * 3] = i;
//           }
//           if (LR[label[pos] * 3] < i) {
//             LR[label[pos] * 3] = i;
//           }
//           if (j < UL[label[pos] * 3 + 1]) {
//             UL[label[pos] * 3 + 1] = j;
//           }
//           if (LR[label[pos] * 3 + 1] < j) {
//             LR[label[pos] * 3 + 1] = j;
//           }
//           if (k < UL[label[pos] * 3 + 2]) {
//             UL[label[pos] * 3 + 2] = k;
//           }
//           if (LR[label[pos] * 3 + 2] < k) {
//             LR[label[pos] * 3 + 2] = k;
//           }
//         }
//       }
//     }
//   }
//   return [img, label, sum, volume, UL, LR];
// }

// function sampleImg(
//   neighbor: number
// ): [Uint8Array, Uint8Array, number, Uint32Array, Uint16Array, Uint16Array] {
//   const [width, height, NSlice] = [16, 16, 16];
//   if (neighbor === 6 || neighbor === 26) {
//     // prettier-ignore
//     const img =  new Uint8Array([
//       1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 1, 1, 0, 0, 1, 1, 0, 0,
//       0, 0, 1, 1, 0, 0, 1, 0, 1, 0,
//       0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
//       0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
//       0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 1
//     ]);
//     if (neighbor === 6) {
//       // prettier-ignore
//       const label = new Uint8Array([
//         1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 2, 2, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 2, 0, 0, 0, 3, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 0, 2, 0, 0, 0, 0, 0, 0,
//         0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
//         0, 0, 2, 2, 0, 0, 3, 3, 0, 0,
//         0, 0, 2, 2, 0, 0, 3, 0, 4, 0,
//         0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
//         0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
//         0, 0, 0, 0, 0, 0, 3, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 6
//       ]);
//       const volume = new Uint32Array([260, 1, 14, 21, 1, 2, 1]);
//       // prettier-ignore
//       const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 1, 1, 0, 6, 3, 0, 8, 4, 1, 9, 5, 1, 9, 9, 2]);
//       // prettier-ignore
//       const LR = new Uint16Array([9, 9, 2, 0, 0, 0, 3, 4, 1, 8, 7, 2, 8, 4, 1, 9, 6, 1, 9, 9, 2]);
//       return [img, label, 6, volume, UL, LR];
//     } else {
//       // prettier-ignore
//       const label = new Uint8Array([
//         1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 1, 0, 0, 0, 2, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
//         0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
//         0, 0, 1, 1, 0, 0, 2, 2, 0, 0,
//         0, 0, 1, 1, 0, 0, 2, 0, 2, 0,
//         0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
//         0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
//         0, 0, 0, 0, 0, 0, 2, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 3
//       ]);
//       const volume = new Uint32Array([260, 15, 24, 1]);
//       // prettier-ignore
//       const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 6, 3, 0, 9, 9, 2]);
//       // prettier-ignore
//       const LR = new Uint16Array([9, 9, 2, 3, 4, 1, 9, 7, 2, 9, 9, 2]);
//       return [img, label, 3, volume, UL, LR];
//     }
//   } else {
//     // prettier-ignore
//     const img =  new Uint8Array([
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//       1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
//     ]);
//     if (neighbor === 4) {
//       // prettier-ignore
//       const label =  new Uint8Array([
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 4, 0, 0, 5, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
//       ]);
//       const volume = new Uint32Array([236, 1, 6, 2, 3, 1, 2, 4, 1]);
//       // prettier-ignore
//       const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 7, 7, 0, 6, 8, 0, 9, 8, 0, 10, 9, 0, 7, 11, 0, 0, 15, 0]);
//       // prettier-ignore
//       const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 8, 7, 0, 6, 10, 0, 9, 8, 0, 10, 10, 0, 9, 12, 0, 0, 15, 0]);

//       return [img, label, 8, volume, UL, LR];
//     } else {
//       // prettier-ignore
//       const label =  new Uint8Array([
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
//       ]);
//       const volume = new Uint32Array([236, 1, 6, 12, 1]);
//       // prettier-ignore
//       const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 6, 7, 0, 0, 15, 0]);
//       // prettier-ignore
//       const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 10, 12, 0, 0, 15, 0]);
//       return [img, label, 4, volume, UL, LR];
//     }
//   }
// }

// const [width, height, NSlice] = [10, 10, 1];
// const [array, label, sum, _volume, _UL, _LR] = mosaic(
//   width,
//   height,
//   NSlice,
//   26
// );
// //const [array, label, sum, _volume, _UL, _LR] = sampleImg(26);
// const results = CCL(array, width, height);

// for (let j = 0; j < height; j++) {
//   let moji = '';
//   for (let i = 0; i < width; i++) {
//     const pos = i + j * width;
//     moji += ` ${array[pos]}(${results.labelMap[pos]})${label[pos]}|`;
//   }
//   console.log(moji);
// }

// console.log(results.labelnum, sum, results.labels);
// for (let i = 0; i <= results.labelnum; i++) {
//   console.log(
//     `${i} ${results.labels[i].volume}(${_volume[i]}) [${
//       results.labels[i].min[0]
//     }(${_UL[i * 3]}), ${results.labels[i].min[1]}(${_UL[i * 3 + 1]})]-[${
//       results.labels[i].max[0]
//     }(${_LR[i * 3]}), ${results.labels[i].max[1]}(${_LR[i * 3 + 1]})]`
//   );
// }
