import { Models } from '../interface';
import MultiRange from 'multi-integer-range';

export const toEntry = async (uidStr: string, models: Models) => {
  const [seriesUid, ...pvdStrs] = uidStr.split(':');
  const partialVolumeDescriptor =
    pvdStrs.length === 3
      ? {
          start: Number(pvdStrs[0]),
          end: Number(pvdStrs[1]),
          delta: Number(pvdStrs[2])
        }
      : await (async () => {
          const seriesData = await models.series.findByIdOrFail(seriesUid);
          const firstSegment = new MultiRange(seriesData.images).getRanges()[0];
          return {
            start: firstSegment[0],
            end: firstSegment[1],
            delta: 1
          };
        })();
  return { seriesUid, partialVolumeDescriptor };
};
