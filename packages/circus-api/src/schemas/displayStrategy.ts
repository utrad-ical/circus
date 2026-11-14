import { z } from 'zod';

/**
 * Determines how plug-in results are displayed and how feedback is collected.
 */
export const displayStrategy = z.array(
  z.looseObject({
    type: z.string().optional(),
    feedbackKey: z.string().optional(),
    caption: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
  })
);
