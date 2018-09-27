/**
 * Defines a set of integers to construct a partial volume
 * from a DICOM series.
 */
export default interface PartialVolumeDescriptor {
  start: number;
  end: number;
  delta: number;
}

/**
 * Stringifies a PartialVolumeDescriptor like "1, 3, ..., 11".
 * @param descriptor The partial volume descriptor to convert to a string.
 * @param maxNums The maximum number of integers that can appear in the output.
 */
export const describePartialVolumeDescriptor = (
  descriptor: PartialVolumeDescriptor,
  maxNums: number = 4
) => {
  if (!isValidPartialVolumeDescriptor(descriptor)) return 'Invalid';
  const { start, end, delta } = descriptor;
  const count = (end - start) / delta + 1;
  if (count >= maxNums + 1) {
    let result = '';
    for (let i = 0; i < maxNums - 1; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result + ', ..., ' + end;
  } else {
    let result = '';
    for (let i = 0; i < count; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result;
  }
};

/**
 * Checks if the given partial volume descriptor is valid.
 * @param descriptor The partial volume desciptor to check.
 */
export const isValidPartialVolumeDescriptor = (
  descriptor: PartialVolumeDescriptor
) => {
  const { start, end, delta } = descriptor;
  const isNatural = (value: any) => Number.isInteger(value) && value > 0;
  if (descriptor.start > descriptor.end) return false;
  if (!isNatural(start) || !isNatural(end) || !isNatural(delta)) return false;
  if (!isNatural((end - start) / delta + 1)) return false;
  return true;
};
