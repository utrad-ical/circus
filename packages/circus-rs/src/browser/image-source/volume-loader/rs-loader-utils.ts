import PartialVolumeDescriptor from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

export type EstimateWindowType = 'full' | 'first' | 'center' | 'none';

export const createRequestParams = (
  partialVolumeDescriptor?: PartialVolumeDescriptor,
  estimateWindowType?: EstimateWindowType
) => {
  const result = {};
  if (typeof estimateWindowType === 'string' && estimateWindowType !== 'none') {
    Object.assign(result, { estimateWindow: estimateWindowType });
  }
  if (partialVolumeDescriptor) {
    Object.assign(result, partialVolumeDescriptor);
  }
  return result;
};
