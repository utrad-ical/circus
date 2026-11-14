import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import type { SeriesEntry } from '#components/SeriesSelector.tsx';
import { createDraft, finishDraft } from 'immer';
import * as mr from 'multi-integer-range';
import type Series from '#types/Series.ts';
import type { RootState } from '../store/index.ts';
import { api } from './api.ts';
import asyncMap from './asyncMap.ts';

export const defaultPvd = (images: string): PartialVolumeDescriptor => {
  const range = mr.parse(images);
  if (range.length === 0 || mr.isUnbounded(range))
    throw new Error('Invalid images string');
  const firstSegment = range[0];
  return { start: firstSegment[0], end: firstSegment[1], delta: 1 };
};

export const defaultPvdFromSeries = async (
  seriesUid: string,
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
        state
      );
    }
  });
  return finishDraft(draft);
};

export default fillPartialVolumeDescriptors;
