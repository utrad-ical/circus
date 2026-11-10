import type PartialVolumeDescriptor from '@utrad-ical/circus-rs/src/volume/PartialVolumeDescriptor.ts';

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}
