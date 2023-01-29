import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { multirange } from 'multi-integer-range';
import Series from 'types/Series';
import { RootState } from '../store';
import { ApiCaller } from './api';

export const defaultPvd = (images: string): PartialVolumeDescriptor => {
  const mr = multirange(images);
  if (mr.segmentLength() === 0 || mr.isUnbounded())
    throw new Error('Invalid images string');
  const firstSegment = mr.getRanges()[0];
  return { start: firstSegment[0], end: firstSegment[1], delta: 1 };
};

export const defaultPvdFromSeries = async (
  seriesUid: string,
  api: ApiCaller,
  state?: RootState
) => {
  const series =
    state?.searches.items.series?.[seriesUid] ||
    ((await api('series/' + seriesUid)) as Series);
  return defaultPvd(series.images);
};
