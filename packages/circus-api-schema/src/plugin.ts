import { z } from 'zod';
import { displayStrategy } from './displayStrategy.ts';
import { dateField, dockerId, semverString } from './formats.ts';
import { icon } from './icon.ts';

export const plugin = z
  .strictObject({
    pluginId: dockerId().optional().describe('The unique ID of this plug-in.'),
    pluginName: z.string().min(1).max(128).optional(),
    version: semverString().optional(),
    type: z.enum(['CAD']).optional(),
    description: z
      .string()
      .max(128)
      .optional()
      .describe('Short text that describes what this plug-in does.'),
    runConfiguration: z
      .strictObject({
        timeout: z
          .int()
          .min(0)
          .optional()
          .describe('Execution timeout in seconds (0 means no timeout).'),
        gpus: z.string().optional().describe('Passed to Docker container.')
      })
      .optional()
      .describe('Installation-specific configurations.'),
    icon: icon.optional(),
    displayStrategy: displayStrategy.optional()
  })
  .describe('Represents a CIRCUS CS plug-in (app).');

/** Registers a plug-in */
export const pluginCreate = plugin.required();

/** A plug-in in the database */
export const pluginDoc = pluginCreate.extend({
  createdAt: dateField(),
  updatedAt: dateField()
});

/** Updates a plug-in, whose ID and type cannot be changed */
export const pluginPatch = plugin.omit({ pluginId: true, type: true });
