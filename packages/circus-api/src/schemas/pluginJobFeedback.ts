import { z } from 'zod';
import { dateField } from './formats.ts';

export const pluginJobFeedback = z
  .strictObject({
    feedbackId: z.string().optional(),
    isConsensual: z.boolean().optional(),
    userEmail: z.string().optional(),
    data: z.unknown().optional(), // Any JSON-serializable data
    actionLog: z
      .array(
        z.strictObject({
          date: dateField(),
          action: z.string(),
          data: z.record(z.string(), z.unknown()).optional()
        })
      )
      .optional(),
    createdAt: dateField().optional()
  })
  .describe('Represents a CIRCUS CS feedback entry.');
