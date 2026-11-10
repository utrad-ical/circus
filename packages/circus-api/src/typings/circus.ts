import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs/server';

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}
