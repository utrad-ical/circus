import { z } from 'zod';
import { dicomUid } from './formats.ts';
import { label } from './label.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';

export const revisionSeriesEntry = z.strictObject({
  seriesUid: dicomUid(),
  partialVolumeDescriptor: partialVolumeDescriptor.optional(),
  labels: z.array(label).describe('The list of labels attached to this series.')
});
