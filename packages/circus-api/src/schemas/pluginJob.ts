import { z } from 'zod';
import { dateField } from './formats.ts';
import { pluginJobFeedback } from './pluginJobFeedback.ts';
import { pluginJobSeries } from './pluginJobSeries.ts';

export const pluginJob = z
  .strictObject({
    jobId: z.string().optional().describe('The unique ID of the job.'),
    pluginId: z.string().optional(),
    userEmail: z.string().optional(),
    status: z
      .enum([
        'in_queue',
        'processing',
        'finished',
        'cancelled',
        'failed',
        'invalidated'
      ])
      .optional()
      .describe('The current status of this job.'),
    errorMessage: z
      .string()
      .nullable()
      .optional()
      .describe("Contains an error message if the status is 'failed'."),
    series: z.array(pluginJobSeries).min(1).optional(),
    feedbacks: z.array(pluginJobFeedback).optional(),
    startedAt: dateField().nullable().optional().describe('Job start time.'),
    finishedAt: dateField().nullable().optional().describe('Job finish time.'),
    results: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional()
      .describe('The result data of this plug-in job.')
  })
  .describe('Represents a CIRCUS CS plug-in job.');
