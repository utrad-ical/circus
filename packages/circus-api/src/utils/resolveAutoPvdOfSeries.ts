import * as mr from 'multi-integer-range';
import type { SeriesEntry } from '@utrad-ical/circus-cs-core';
import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs/server';
import status from 'http-status';
import type { Models } from '../interface.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  assertSeriesDomainAccess,
  type UserPrivilegeInfo
} from '../privilegeUtils.ts';
import type { SeriesOrientationResolver } from './createSeriesOrientationResolver.ts';

export interface AutoPvdSeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor | 'auto';
}

const resolveAutoPvdOfSeries = async (
  seriesList: AutoPvdSeriesEntry[],
  models: Models,
  userPrivileges: UserPrivilegeInfo,
  seriesOrientationResolver: SeriesOrientationResolver
): Promise<SeriesEntry[]> => {
  const resolvedSeries: SeriesEntry[] = [];
  for (const series of seriesList) {
    const { seriesUid } = series;
    let { partialVolumeDescriptor } = series;
    if (partialVolumeDescriptor === 'auto') {
      const seriesData = await models.series.findById(seriesUid);
      if (!seriesData) {
        throw httpError(status.BAD_REQUEST, 'Nonexistent series.');
      }
      assertSeriesDomainAccess(userPrivileges, seriesData.domain);
      const [firstSegment] = mr.initialize(seriesData.images);
      if (!firstSegment) {
        throw httpError(status.BAD_REQUEST, 'The series has no images.');
      }
      const [start, end] = firstSegment;
      partialVolumeDescriptor = await seriesOrientationResolver(
        seriesUid,
        start,
        end
      );
    }
    resolvedSeries.push({ ...series, partialVolumeDescriptor });
  }
  return resolvedSeries;
};

export default resolveAutoPvdOfSeries;
