import { SeriesEntry } from '@utrad-ical/circus-cs-core';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { Models } from 'interface';
import MultiRange from 'multi-integer-range';
import { SeriesOrientationResolver } from './createSeriesOrientationResolver';

export interface AutoPvdSeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor | 'auto';
}

const resolveAutoPvdOfSeries = async (
  seriesList: AutoPvdSeriesEntry[],
  models: Models,
  seriesOrientationResolver: SeriesOrientationResolver
): Promise<SeriesEntry[]> => {
  const resolveOne = async (
    series: AutoPvdSeriesEntry
  ): Promise<SeriesEntry> => {
    if (series.partialVolumeDescriptor !== 'auto') return series as SeriesEntry;
    const seriesData = await models.series.findByIdOrFail(series.seriesUid);
    const images = new MultiRange(seriesData.images);
    if (images.length() === 0) throw new Error('Empty series');
    const firstSegment = images.getRanges()[0];
    const partialVolumeDescriptor = await seriesOrientationResolver(
      series.seriesUid,
      firstSegment[0],
      firstSegment[1]
    );
    return { ...series, partialVolumeDescriptor };
  };

  return await Promise.all(
    seriesList.map(s =>
      s.partialVolumeDescriptor === 'auto' ? resolveOne(s) : (s as SeriesEntry)
    )
  );
};

export default resolveAutoPvdOfSeries;
