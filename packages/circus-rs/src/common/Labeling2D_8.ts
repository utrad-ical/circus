function makeBinaryImg(
  array: Uint8Array | Uint16Array,
  threshold: number,
  width: number,
  height: number
) {
  return (x: number, y: number) => {
    return x < 0 || width <= x || y < 0 || height <= y
      ? -1
      : threshold < array[x + y * width]
      ? 1
      : 0;
  };
}

function value(width: number, height: number) {
  return (array: Uint8Array | Uint16Array, x: number, y: number) => {
    return x < 0 || width <= x || y < 0 || height <= y
      ? -1
      : array[x + y * width];
  };
}

function makeTable(width: number, height: number) {
  const chiefLabelTable = new Array(Math.floor(width * height) + 1);
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
 * @param threshold: voxel value of threshold
 */
export default function labeling(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  threshold = 0
): [Uint16Array, number] {
  const [dx, dy, dz] = [
    [0, -1, 0],
    [0, 0, -1],
    [-1, 0, 0]
  ];
  const binaryImg = makeBinaryImg(array, threshold, width, height);
  const val = value(width, height);
  const table = makeTable(width, height);
  const labelImg = new Uint16Array(width * height).map(() => {
    return 0;
  });

  let label = 0;

  for (let j = 0; j < height; j += 2) {
    for (let i = 0; i < width; i++) {
      if (binaryImg(i, j) > 0) {
        if (val(labelImg, i - 1, j) <= 0) {
          if (val(labelImg, i - 1, j + 1) > 0) {
            labelImg[i + j * width] = val(labelImg, i - 1, j + 1);
            if (val(labelImg, i, j - 1) > 0) {
              table.resolve(
                val(labelImg, i - 1, j + 1),
                val(labelImg, i, j - 1)
              );
            } else {
              if (val(labelImg, i - 1, j - 1) > 0) {
                table.resolve(
                  val(labelImg, i - 1, j + 1),
                  val(labelImg, i - 1, j - 1)
                );
              }
              if (val(labelImg, i + 1, j - 1) > 0) {
                table.resolve(
                  val(labelImg, i - 1, j + 1),
                  val(labelImg, i + 1, j - 1)
                );
              }
            }
          } else if (val(labelImg, i, j - 1) > 0) {
            labelImg[i + j * width] = val(labelImg, i, j - 1);
          } else if (val(labelImg, i - 1, j - 1) > 0) {
            labelImg[i + j * width] = val(labelImg, i - 1, j - 1);
            if (val(labelImg, i + 1, j - 1) > 0) {
              table.resolve(
                val(labelImg, i - 1, j - 1),
                val(labelImg, i + 1, j - 1)
              );
            }
          } else if (val(labelImg, i + 1, j - 1) > 0) {
            labelImg[i + j * width] = val(labelImg, i + 1, j - 1);
          } else {
            labelImg[i + j * width] = ++label;
            table.setNewLabel(label);
          }
        } else {
          labelImg[i + j * width] = val(labelImg, i - 1, j);
          if (val(labelImg, i, j - 1) <= 0 && 0 < val(labelImg, i + 1, j - 1)) {
            table.resolve(val(labelImg, i - 1, j), val(labelImg, i + 1, j - 1));
          }
        }
        if (binaryImg(i, j + 1) > 0) {
          labelImg[i + (j + 1) * width] = labelImg[i + j * width];
        }
      } else if (binaryImg(i, j + 1) > 0) {
        if (val(labelImg, i - 1, j) > 0) {
          labelImg[i + (j + 1) * width] = val(labelImg, i - 1, j);
        } else if (val(labelImg, i - 1, j + 1) > 0) {
          labelImg[i + (j + 1) * width] = val(labelImg, i - 1, j + 1);
        } else {
          labelImg[i + (j + 1) * width] = ++label;
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
  for (let i = 0; i < width * height; i++) {
    labelImg[i] = chiefLabelTable[labelImg[i]];
  }
  return [labelImg, newLabel];
}
