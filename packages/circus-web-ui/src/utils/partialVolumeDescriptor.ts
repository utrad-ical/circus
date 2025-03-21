import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { SeriesEntry } from 'components/SeriesSelector';
import { createDraft, finishDraft } from 'immer';
import { multirange } from 'multi-integer-range';
import Series from 'types/Series';
import { RootState } from '../store';
import { ApiCaller } from './api';
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
    state?.searches.items.series?.[seriesUid] ||
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
  const draft = createDraft(entries);
  await asyncMap(draft, async entry => {
    if (
      !entry.partialVolumeDescriptor ||
      entry.partialVolumeDescriptor === 'auto'
    ) {
      entry.partialVolumeDescriptor = await defaultPvdFromSeries(
        entry.seriesUid,
        api,
        state
      );
    }
  });
  return finishDraft(draft);
};

export default fillPartialVolumeDescriptors;
