import { LabelingResults } from './ConnectedComponentLabeling2D8';

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

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i += 2) {
      if (val0(i, j) > threshold) {
        if (val(i, j - 1) > 0) {
          labelImg[i + j * width] = val(i, j - 1);
          if (val(i - 1, j) > 0) {
            resolve(val(i - 1, j), val(i, j - 1));
          }
        } else if (val(i - 1, j) > 0) {
          labelImg[i + j * width] = val(i - 1, j);
        } else {
          ++label;
          if (num_maxCCL <= label) {
            throw new Error(`number of tentative label is not in 8 bit.`);
          }
          labelImg[i + j * width] = label;
          setNewLabel(label);
        }
        if (val0(i + 1, j) > threshold) {
          labelImg[i + 1 + j * width] = labelImg[i + j * width];
        }
      } else if (val0(i + 1, j) > threshold) {
        ++label;
        if (num_maxCCL <= label) {
          throw new Error(`number of tentative label is not in 8 bit.`);
        }
        labelImg[i + 1 + j * width] = label;
        setNewLabel(label);
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
