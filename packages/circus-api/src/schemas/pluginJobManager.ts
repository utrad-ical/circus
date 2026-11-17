import { z } from 'zod';

export const pluginJobManager = z
  .strictObject({
    status: z.enum(['running', 'stopped'])
  })
  .describe('Used to turn on/off the plug-in job manager.');
