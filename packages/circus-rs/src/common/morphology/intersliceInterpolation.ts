import distanceTransform from './distanceTransform';

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 */
const intersliceInterpolation: (
  array: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  mode: 'Single' | 'Multi'
) => Uint8Array = (array, width, height, nSlices, mode) => {
  const labeledSlices: number[] = [];
  const centerXs: number[] = [];
  const centerYs: number[] = [];
  const output = array.slice(0);
  for (let k = 0; k < nSlices; k++) {
    if (
      array
        .slice(k * width * height, (k + 1) * width * height)
        .some(value => value > 0)
    ) {
      labeledSlices.push(k);
    }
  }

  if (mode === 'Single') {
    for (const k of labeledSlices) {
      let centerX = 0;
      let centerY = 0;
      let count = 0;
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const pos = i + j * width + k * width * height;
          if (0 < array[pos]) {
            centerX += i;
            centerY += j;
            count++;
          }
        }
      }
      centerXs.push(centerX / count);
      centerYs.push(centerY / count);
    }
  }

  let slice1: Float32Array;
  for (let pos = 0, reset = true; pos < labeledSlices.length - 1; pos++) {
    const k0 = labeledSlices[pos];
    const k1 = labeledSlices[pos + 1];
    if (k1 - k0 < 2) {
      reset = true;
      continue;
    }
    if (reset) {
      const inputSlice =
        mode === 'Single'
          ? resampled(
              array.slice(k0 * width * height, (k0 + 1) * width * height),
              width,
              height,
              centerXs[pos],
              centerYs[pos]
            )
          : array.slice(k0 * width * height, (k0 + 1) * width * height);
      slice1 = distanceTransform(inputSlice, width, height);
      reset = false;
    }
    const inputSlice =
      mode === 'Single'
        ? resampled(
            array.slice(k1 * width * height, (k1 + 1) * width * height),
            width,
            height,
            centerXs[pos + 1],
            centerYs[pos + 1]
          )
        : array.slice(k1 * width * height, (k1 + 1) * width * height);
    const slice2 = distanceTransform(inputSlice, width, height);
    if (mode === 'Single') {
      for (let k = k0 + 1; k < k1; k++) {
        const interpolatedSlice = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
          interpolatedSlice[i] =
            slice1![i] * (k1 - k) + slice2[i] * (k - k0) <= 0 ? 1 : 0;
        }

        const centerX =
          (centerXs[pos] * (k1 - k)) / (k1 - k0) +
          (centerXs[pos + 1] * (k - k0)) / (k1 - k0);
        const centerY =
          (centerYs[pos] * (k1 - k)) / (k1 - k0) +
          (centerYs[pos + 1] * (k - k0)) / (k1 - k0);
        const resampleInterpolatedSlice = resampled(
          interpolatedSlice,
          width,
          height,
          centerX,
          centerY,
          false
        );
        for (let i = 0; i < width * height; i++) {
          output[i + k * width * height] = resampleInterpolatedSlice[i];
        }
      }
    } else {
      for (let k = k0 + 1; k < k1; k++) {
        for (let i = 0; i < width * height; i++) {
          output[i + k * width * height] =
            slice1![i] * (k1 - k) + slice2[i] * (k - k0) <= 0 ? 1 : 0;
        }
      }
    }
    slice1 = slice2.slice(0);
  }
  return output;
};

export default intersliceInterpolation;

const resampled: (
  array: Uint8Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  reverse?: boolean
) => Uint8Array = (array, width, height, centerX, centerY, reverse = true) => {
  const output = new Uint8Array(width * height);
  const ULx = Math.round(centerX - width / 2);
  const ULy = Math.round(centerY - height / 2);

  let pos = -1;
  for (let j = ULy; j < ULy + height; j++) {
    for (let i = ULx; i < ULx + width; i++) {
      pos++;
      if (i < 0 || width <= i || j < 0 || height <= j) continue;
      const pos0 = i + j * width;
      if (reverse) {
        output[pos] = array[pos0];
      } else {
        output[pos0] = array[pos];
      }
    }
  }

  return output;
};
