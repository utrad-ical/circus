import { multirange } from 'multi-integer-range';
import { RootState } from '../store';
import { ApiCaller } from './api';
import Series from 'types/Series';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { SeriesEntry } from 'components/SeriesSelector';
import asyncMap from './asyncMap';

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
    state?.searches.series?.results?.items[seriesUid] ||
    state?.searches.relevantSeries?.results?.items[seriesUid] ||
    ((await api('series/' + seriesUid)) as Series);
  return defaultPvd(series.images);
};

/**
 * Fills a partial volume descriptor when empty, and
 * returns an array of `SeriesEntry` suitable for job/case registration.
 */
export const fillPartialVolumeDescriptors = async (
  entries: SeriesEntry[],
  api: ApiCaller,
  state?: RootState
): Promise<SeriesEntry[]> => {
  return await asyncMap(
    entries,
    async s =>
      ({
        seriesUid: s.seriesUid,
        partialVolumeDescriptor:
          s.partialVolumeDescriptor ||
          (await defaultPvdFromSeries(s.seriesUid, api, state))
      } as SeriesEntry)
  );
};

export default fillPartialVolumeDescriptors;
