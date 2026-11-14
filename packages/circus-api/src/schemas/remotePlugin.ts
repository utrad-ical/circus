import { z } from 'zod';
import { displayStrategy } from './displayStrategy.ts';
import { semverString } from './formats.ts';
import { icon } from './icon.ts';

export const remotePlugin = z
  .strictObject({
    pluginId: z.string().optional().describe('The unique ID of this plug-in.'),
    pluginName: z.string().min(1).max(128).optional(),
    version: semverString().optional(),
    type: z.enum(['CAD+remote']).optional(),
    description: z.string().max(128).optional(),
    runConfiguration: z
      .strictObject({
        adapter: z.string().optional().describe('Adapter name.'),
        parameters: z
          .looseObject({
            endpoint: z.string().optional(),
            authentification: z.string().optional(),
            maxConcurrency: z.int().optional(),
            timeout: z.int().optional().describe('Timeout in seconds.'),
            env: displayStrategy.optional()
          })
          .optional()
          .describe('Parameters for the adapter.')
      })
      .optional()
      .describe('Installation-specific configurations.'),
    icon: icon.optional(),
    displayStrategy: displayStrategy.optional()
  })
  .describe('Represents a remote CIRCUS CS plug-in (app).');
