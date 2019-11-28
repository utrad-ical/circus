/**
 * Inverts the stored pixel value according to the DICOM PhotometricInterpretation spec.
 * @param input
 * @param bitsStored
 * @param pixelRepresentation
 */
export const invertPixelValue = (
  input: number,
  bitsStored: number,
  pixelRepresentation: number
) => {
  if (pixelRepresentation === 0) {
    // unsigned
    return (1 << bitsStored) - 1 - input;
  } else {
    // signed
    return -input - 1;
  }
};
