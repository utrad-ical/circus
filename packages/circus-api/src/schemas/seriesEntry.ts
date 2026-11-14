import { z } from 'zod';
import { dicomUid } from './formats.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';

export const seriesEntry = z.strictObject({
  seriesUid: dicomUid(),
  partialVolumeDescriptor
});
