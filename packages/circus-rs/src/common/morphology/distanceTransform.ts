const INF = 1e20;
// https://observablehq.com/@mourner/fast-distance-transform

const borderImage: (
  array: Uint8Array,
  width: number,
  height: number,
  structure?: { dy: number[]; dx: number[] },
  background?: number,
  foreground?: number
) => Float32Array = (
  array,
  width,
  height,
  structure = {
    dy: [-1, 0, 0, 1],
    dx: [0, -1, 1, 0]
  },
  background = INF,
  foreground = 0
) => {
  const { dx, dy } = structure;
  const border = new Float32Array(width * height).fill(background);

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const pos = i + j * width;
      if (array[pos]) {
        let flag = false;
        for (
          let structure_pos = 0;
          structure_pos < dx.length;
          structure_pos++
        ) {
          if (
            i + dx[structure_pos] < 0 ||
            j + dy[structure_pos] < 0 ||
            width <= i + dx[structure_pos] ||
            height <= j + dy[structure_pos]
          ) {
            flag = true;
            break;
          }
          const tmp_pos =
            i + dx[structure_pos] + (j + dy[structure_pos]) * width;
          if (array[tmp_pos] === 0) {
            flag = true;
            break;
          }
        }
        if (flag) border[pos] = foreground;
      }
    }
  }

  return border;
};

function edt(data: Float32Array, width: number, height: number) {
  const f = new Float32Array(Math.max(width, height));
  const v = new Uint16Array(Math.max(width, height));
  const z = new Float32Array(Math.max(width, height) + 1);
  for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(
  grid: Float32Array,
  offset: number,
  stride: number,
  length: number,
  f: Float32Array,
  v: Uint16Array,
  z: Float32Array
) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);

    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

const distanceTransform: (
  array: Uint8Array,
  width: number,
  height: number
) => Float32Array = (array, width, height) => {
  const output = borderImage(array, width, height);

  edt(output, width, height);
  for (let i = 0; i < width * height; i++) {
    output[i] = output[i] ** 0.5;
    if (array[i] !== 0) output[i] *= -1;
  }

  return output;
};
export default distanceTransform;
