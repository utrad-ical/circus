import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}
