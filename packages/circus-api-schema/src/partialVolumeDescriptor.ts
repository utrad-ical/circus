import { z } from 'zod';
import { num } from './formats.ts';

export const partialVolumeDescriptor = z
  .strictObject({
    start: num(),
    end: num(),
    delta: num()
  })
  .describe('Defines partial volume in series images.');
