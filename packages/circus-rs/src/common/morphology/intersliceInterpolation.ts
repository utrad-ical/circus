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
  nSlices: number
) => Uint8Array = (array, width, height, nSlices) => {
  const labeledSlices: number[] = [];
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

  let slice1: Float32Array;
  for (let pos = 0, reset = true; pos < labeledSlices.length - 1; pos++) {
    const k0 = labeledSlices[pos];
    const k1 = labeledSlices[pos + 1];
    if (k1 - k0 < 2) {
      reset = true;
      continue;
    }
    if (reset) {
      slice1 = distanceTransform(
        array.slice(k0 * width * height, (k0 + 1) * width * height),
        width,
        height
      );
      reset = false;
    }
    const slice2 = distanceTransform(
      array.slice(k1 * width * height, (k1 + 1) * width * height),
      width,
      height
    );
    for (let k = k0 + 1; k < k1; k++) {
      for (let i = 0; i < width * height; i++) {
        const pos = i + k * width * height;
        output[pos] = slice1![i] * (k1 - k) + slice2[i] * (k - k0) <= 0 ? 1 : 0;
      }
    }
    slice1 = slice2.slice(0);
  }
  return output;
};

export default intersliceInterpolation;
