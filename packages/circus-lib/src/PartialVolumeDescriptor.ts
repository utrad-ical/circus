import MultiRange from 'multi-integer-range';

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
  if (
    !isNatural(start) ||
    !isNatural(end) ||
    !Number.isInteger(delta) ||
    delta === 0
  )
    return false;
  if ((start > end && delta > 0) || (start < end && delta < 0)) return false;
  if (!isNatural((end - start) / delta + 1)) return false;
  if (start === end && delta === -1) return false;
  return true;
};

/**
 * Returns true if the partial volume described with `descriptor`
 * is includd in the images described sith `range`.
 * @param range The image range to check.
 * @param desciptor The
 */
export const rangeHasPartialVolume = (
  range: MultiRange,
  descriptor: PartialVolumeDescriptor
) => {
  if (!isValidPartialVolumeDescriptor(descriptor))
    throw new Error('Invalid partial volume descriptor');
  const { start, end, delta } = descriptor;
  if (range.has([[Math.min(start, end), Math.max(start, end)]])) return true;
  if (delta !== 1 && delta !== -1) {
    for (let i = start; i !== end; i += delta) if (!range.has(i)) return false;
    return true;
  }
  return false;
};
