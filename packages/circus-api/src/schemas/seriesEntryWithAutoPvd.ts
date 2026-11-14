import { z } from 'zod';
import { dicomUid } from './formats.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';

export const seriesEntryWithAutoPvd = z.strictObject({
  seriesUid: dicomUid(),
  partialVolumeDescriptor: z.union([z.literal('auto'), partialVolumeDescriptor])
});
