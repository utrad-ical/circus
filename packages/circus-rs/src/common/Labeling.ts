import { dirxml } from 'console';

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

/**
 * Return labeled image
 * @param array: input binary image
 * @param width: width of array
 * @param height: height of array
 * @param NSlice: slice number of array
 * @param neighbors: 6 | 26
 * @param threshold: voxel value of threshold
 */
export default function labeling3D(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  NSlice: number,
  neighbors: 6 | 26,
  threshold = 0
): [Uint8Array | Uint16Array, number] {
  if (neighbors !== 6 && neighbors !== 26) {
    throw new TypeError('neighbor should be 6 | 26');
  }

  const [dx, dy, dz] = mask(neighbors);
  const binaryImg = makeBinaryImg(array, threshold, width, height, NSlice);
  const labelImg = new Uint16Array(width * height * NSlice).map(() => {
    return 0;
  });
  const table = new Uint16Array(Math.ceil((width * height * NSlice) / 2) + 1);
  const buf = new Uint16Array(neighbors);
  let label = (table[0] = 0);

  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + j * width + k * width * height;
        if (binaryImg(i, j, k) > 0) {
          let n = 0;
          for (let p = 0; p < neighbors / 2; p++) {
            if (binaryImg(i + dx[p], j + dy[p], k + dz[p]) === -1) {
              continue;
            }
            const _pos =
              i + dx[p] + (j + dy[p]) * width + (k + dz[p]) * width * height;
            if (labelImg[_pos] > 0) {
              buf[n] = table[labelImg[_pos]];
              n++;
            }
          }
          if (n === 0) {
            label++;
            labelImg[pos] = label;
            table[label] = label;
          } else if (n === 1) {
            labelImg[pos] = buf[0];
          } else {
            n = labelSort(buf, n);
            labelTableAdd(table, buf, n, label);
            labelImg[pos] = buf[0];
          }
        }
      }
    }
  }

  const newlabel = labelTableSort(table, label);
  let labeledImg;
  if (newlabel > 255) {
    labeledImg = new Uint16Array(width * height * NSlice);
  } else {
    labeledImg = new Uint8Array(width * height * NSlice);
  }
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + j * width + k * width * height;
        if (labelImg[pos] > 0) {
          labelImg[pos] = table[labelImg[pos]];
        }
        labeledImg[pos] = labelImg[pos];
      }
    }
  }

  return [labeledImg, newlabel];
}

/**
 * Return labeled image
 * @param array: input binary image
 * @param width: width of array
 * @param height: height of array
 * @param neighbors: 4 | 8
 * @param background: voxel value of background
 */
export function labeling2D(
  array: Uint8Array | Uint16Array,
  width: number,
  height: number,
  neighbors: number,
  threshold = 0
): [Uint8Array | Uint16Array, number] {
  if (neighbors !== 4 && neighbors !== 8) {
    throw new TypeError('neighbor should be 6 | 26');
  }

  const [dx, dy] = mask(neighbors);
  const binaryImg = makeBinaryImg(array, threshold, width, height, 1);
  let labelImg = new Uint16Array(width * height).map(() => {
    return 0;
  });
  const table = new Uint16Array(Math.ceil((width * height) / 2) + 1);
  const buf = new Uint16Array(neighbors);
  let label = (table[0] = 0);

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      if (binaryImg(i, j, 0) > 0) {
        let n = 0;
        for (let p = 0; p < neighbors / 2; p++) {
          if (binaryImg(i + dx[p], j + dy[p], 0) === -1) {
            continue;
          }
          const _pos = i + dx[p] + (j + dy[p]) * width;
          if (labelImg[_pos] > 0) {
            buf[n] = table[labelImg[_pos]];
            n++;
          }
        }
        if (n === 0) {
          label++;
          labelImg[i + j * width] = label;
          table[label] = label;
        } else if (n === 1) {
          labelImg[i + j * width] = buf[0];
        } else {
          n = labelSort(buf, n);
          labelTableAdd(table, buf, n, label);
          labelImg[i + j * width] = buf[0];
        }
      }
    }
  }

  const newlabel = labelTableSort(table, label);
  let labeledImg;
  if (newlabel > 255) {
    labeledImg = new Uint16Array(width * height);
  } else {
    labeledImg = new Uint8Array(width * height);
  }
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const pos = i + j * width;
      if (labelImg[pos] > 0) {
        labelImg[pos] = table[labelImg[pos]];
      }
      labeledImg[pos] = labelImg[pos];
    }
  }
  return [labeledImg, newlabel];
}

function mask(neighbors = 6 | 26 | 4 | 8) {
  if (neighbors === 4) {
    return [
      [0, -1],
      [-1, 0]
    ];
  } else if (neighbors === 8) {
    return [
      [-1, 0, 1, -1],
      [-1, -1, -1, 0]
    ];
  } else if (neighbors === 6) {
    return [
      [0, 0, -1],
      [0, -1, 0],
      [-1, 0, 0]
    ];
  } else if (neighbors === 26) {
    return [
      [-1, 0, 1, -1, 0, 1, -1, 0, 1, -1, 0, 1, -1],
      [-1, -1, -1, 0, 0, 0, 1, 1, 1, -1, -1, -1, 0],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0]
    ];
  }
  throw new TypeError(`input neighbor = ${neighbors}: Inappropriate value`);
}

function labelSort(buf: Uint16Array, n: number): number {
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      if (buf[i] === buf[i + 1]) {
        for (let a = i + 1; a < n - 1; a++) {
          buf[a] = buf[a + 1];
        }
        n--;
        i--;
      } else if (buf[i] > buf[i + 1]) {
        buf[i] = [buf[i + 1], (buf[i + 1] = buf[i])][0];
      }
    }
  }
  return n;
}

function labelTableAdd(
  table: Uint16Array,
  buf: Uint16Array,
  n: number,
  label: number
) {
  for (let j = 1; j < n; j++) {
    for (let i = 1; i <= label; i++) {
      table[i] = table[i] === buf[j] ? buf[0] : table[i];
    }
  }
}

function labelTableSort(table: Uint16Array, label: number): number {
  let newlabel = 0;
  for (let i = 1; i <= label; i++) {
    if (table[i] > newlabel) {
      newlabel++;
      if (table[i] === newlabel) {
        continue;
      }
      for (let j = i + 1; j <= label; j++) {
        table[j] = table[j] === table[i] ? newlabel : table[j];
      }
      table[i] = newlabel;
    }
  }
  return newlabel;
}
