/**
 * Parses `startImgNum:endImgNum(:imageDelta)` into a partial volume descriptor.
 */
export function toPartialVolumeDescriptor(str) {
  const [start, end, delta] = str.split(':').map(value => {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  });

  if (start === undefined && end === undefined && delta === undefined) {
    return undefined;
  } else if (start !== undefined && end !== undefined) {
    return { start, end, delta };
  } else {
    throw new Error(
      'Invalid partial volume descriptor specified. ' +
        'partial volume descriptor must be in the form of `startImgNum:endImgNum(:imageDelta)`'
    );
  }
}
