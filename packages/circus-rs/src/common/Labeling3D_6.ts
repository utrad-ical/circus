function makeBinaryImg(
  array: Uint8Array | Uint16Array,
  threshold: number,
  width: number,
  height: number,
  NSlice: number
) {
  return (x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || NSlice <= z
      ? -1
      : threshold < array[x + y * width + z * width * height]
      ? 1
      : 0;
  };
}

function value(width: number, height: number, NSlice: number) {
  return (array: Uint8Array | Uint16Array, x: number, y: number, z: number) => {
    return x < 0 || width <= x || y < 0 || height <= y || z < 0 || NSlice <= z
      ? -1
      : array[x + y * width + z * width * height];
  };
}

function makeTable(width: number, height: number, NSlice: number) {
  const chiefLabelTable = new Array(Math.floor(width * height * NSlice) + 1);
  const substituteLabels: { [name: number]: [number] } = {};
  chiefLabelTable[0] = 0;

  return {
    resolve: function (label1: number, label2: number) {
      if (chiefLabelTable[label1] === chiefLabelTable[label2]) {
        return;
      }
      if (chiefLabelTable[label1] > chiefLabelTable[label2]) {
        [label1, label2] = [label2, label1];
      }
      substituteLabels[chiefLabelTable[label1]].push(
        ...substituteLabels[chiefLabelTable[label2]]
      );
      substituteLabels[chiefLabelTable[label2]].forEach(n => {
        chiefLabelTable[n] = chiefLabelTable[label1];
      });
      delete substituteLabels[label2];
    },
    setNewLabel: function (label: number) {
      chiefLabelTable[label] = label;
      substituteLabels[label] = [label];
    },
    getTable: function () {
      return [chiefLabelTable, substituteLabels];
    }
  };
}

/**
 * Return labeled image
 * @param array: input binary image
 * @param width: width of array
 * @param height: height of array
 * @param NSlice: slice number of array
 * @param threshold: voxel value of threshold
 */
export default function labeling(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  NSlice: number,
  threshold = 0
): [Uint16Array, number] {
  const [dx, dy, dz] = [
    [0, -1, 0],
    [0, 0, -1],
    [-1, 0, 0]
  ];
  const binaryImg = makeBinaryImg(array, threshold, width, height, NSlice);
  const val = value(width, height, NSlice);
  const table = makeTable(width, height, NSlice);
  const labelImg = new Uint16Array(width * height * NSlice).map(() => {
    return 0;
  });

  let label = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (binaryImg(i, j, k) !== 1) {
          continue;
        }
        if (val(labelImg, i + dx[0], j + dy[0], k + dz[0]) > 0) {
          labelImg[i + j * width + k * width * height] = val(
            labelImg,
            i + dx[0],
            j + dy[0],
            k + dz[0]
          );
          if (val(labelImg, i + dx[1], j + dy[1], k + dz[1]) > 0) {
            table.resolve(
              val(labelImg, i + dx[0], j + dy[0], k + dz[0]),
              val(labelImg, i + dx[1], j + dy[1], k + dz[1])
            );
          }
          if (val(labelImg, i + dx[2], j + dy[2], k + dz[2]) > 0) {
            table.resolve(
              val(labelImg, i + dx[0], j + dy[0], k + dz[0]),
              val(labelImg, i + dx[2], j + dy[2], k + dz[2])
            );
          }
        } else if (val(labelImg, i + dx[1], j + dy[1], k + dz[1]) > 0) {
          labelImg[i + j * width + k * width * height] = val(
            labelImg,
            i + dx[1],
            j + dy[1],
            k + dz[1]
          );
          if (val(labelImg, i + dx[2], j + dy[2], k + dz[2]) > 0) {
            table.resolve(
              val(labelImg, i + dx[1], j + dy[1], k + dz[1]),
              val(labelImg, i + dx[2], j + dy[2], k + dz[2])
            );
          }
        } else if (val(labelImg, i + dx[2], j + dy[2], k + dz[2]) > 0) {
          labelImg[i + j * width + k * width * height] = val(
            labelImg,
            i + dx[2],
            j + dy[2],
            k + dz[2]
          );
        } else {
          labelImg[i + j * width + k * width * height] = ++label;
          table.setNewLabel(label);
        }
      }
    }
  }

  const [chiefLabelTable, substituteLabels] = table.getTable();

  let newLabel = 0;
  for (const cLabel of Object.keys(substituteLabels)) {
    newLabel++;
    substituteLabels[Number(cLabel)].forEach((tmpLabel: number) => {
      chiefLabelTable[tmpLabel] = newLabel;
    });
  }
  for (let i = 0; i < width * height * NSlice; i++) {
    labelImg[i] = chiefLabelTable[labelImg[i]];
  }
  return [labelImg, newLabel];
}

function mosaic(
  width: number,
  height: number,
  NSlice: number
): [Uint8Array, Uint16Array, number] {
  const img = new Uint8Array(width * height * NSlice);
  const label = new Uint16Array(width * height * NSlice);
  let sum = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if ((i % 2) + (j % 2) === 1) {
          img[i + j * width + k * width * NSlice] = 1 - (k % 2);
        } else {
          img[i + j * width + k * width * NSlice] = k % 2;
        }
        label[i + j * width + k * width * NSlice] =
          img[i + j * width + k * width * NSlice] === 1 ? ++sum : 0;
      }
    }
  }
  return [img, label, sum];
}
