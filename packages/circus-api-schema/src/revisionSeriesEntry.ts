import { z } from 'zod';
import { dicomUid } from './formats.ts';
import { label, labelCreate } from './label.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';

export const revisionSeriesEntry = z.strictObject({
  seriesUid: dicomUid(),
  partialVolumeDescriptor,
  labels: z.array(label).describe('The list of labels attached to this series.')
});

/** A series in a new revision */
export const revisionSeriesEntryCreate = revisionSeriesEntry.extend({
  labels: z.array(labelCreate)
});
