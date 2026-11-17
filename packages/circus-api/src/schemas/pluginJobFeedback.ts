import { z } from 'zod';
import { dateField } from './formats.ts';

const actionLog = z
  .array(
    z.strictObject({
      date: dateField(),
      action: z.string(),
      data: z.record(z.string(), z.unknown()).optional()
    })
  )
  .describe('The operations of the user while making this feedback.');

/** A feedback entry in a plug-in job in the database */
export const pluginJobFeedback = z
  .strictObject({
    feedbackId: z.string(),
    isConsensual: z.boolean(),
    userEmail: z.string(),
    data: z
      .unknown()
      .describe('The feedback, whose shape is defined by the displays.'),
    actionLog: actionLog.optional(),
    createdAt: dateField()
  })
  .describe('Represents a CIRCUS CS feedback entry.');

/** Registers a feedback */
export const pluginJobFeedbackCreate = z.strictObject({
  data: z.unknown(),
  actionLog: actionLog.optional()
});
