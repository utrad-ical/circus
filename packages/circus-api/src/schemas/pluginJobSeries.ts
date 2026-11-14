import { z } from 'zod';
import { dicomUid } from './formats.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';

export const pluginJobSeries = z
  .strictObject({
    seriesUid: dicomUid(),
    partialVolumeDescriptor: z.union([
      z.literal('auto'),
      partialVolumeDescriptor
    ]),
    requiredPrivateTags: z.string().optional()
  })
  .describe('Series information used to build volumes for CAD plug-ins.');
