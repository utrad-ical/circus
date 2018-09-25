export const describePartialVolumeDescriptor = (descriptor, maxNums = 4) => {
  if (!isValidPartialVolumeDescriptor(descriptor)) return 'Invalid';
  const { start, end, delta } = descriptor;
  const count = (end - start) / delta + 1;
  if (count >= maxNums + 2) {
    let result = '';
    for (let i = 0; i < maxNums - 1; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result + ', ..., ' + end;
  } else {
    let result = '';
    for (let i = 0; i <= count; i++) {
      if (i > 0) result += ', ';
      result += start + delta * i;
    }
    return result;
  }
};

export const isValidPartialVolumeDescriptor = descriptor => {
  const { start, end, delta } = descriptor;
  const isNatural = value => Number.isInteger(value) && value > 0;
  if (descriptor.start > descriptor.end) return false;
  if (!isNatural(start)) return false;
  if (!isNatural(end)) return false;
  if (!isNatural(delta)) return false;
  if (!isNatural((end - start) / delta)) return false;
  return true;
};
