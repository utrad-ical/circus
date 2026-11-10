/**
 * Inverts the stored pixel value.
 * Used when DICOM "PhotometricInterpretation" is set to MONOCHROME1
 * (= minimum value is white).
 * The minimum representable value will become the maximum representable value.
 * @param input The input value (ordinary JavaScript integer).
 * @param bitsStored DICOM "Bits Stored" value,
 * which describes how many bits are used to represent a number.
 * @param pixelRepresentation 0 if unsigned, 1 if signed.
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
