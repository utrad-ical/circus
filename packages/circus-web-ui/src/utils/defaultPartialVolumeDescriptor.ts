import { multirange } from 'multi-integer-range';

const defaultPartialVolumeDescriptor = (images: string) => {
  const mr = multirange(images);
  if (mr.segmentLength() === 0 || mr.isUnbounded())
    throw new Error('Invalid images string');
  const firstSegment = mr.getRanges()[0];
  return { start: firstSegment[0], end: firstSegment[1], delta: 1 };
};

export default defaultPartialVolumeDescriptor;
