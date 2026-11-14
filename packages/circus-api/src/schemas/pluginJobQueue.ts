import { z } from 'zod';
import { dateField } from './formats.ts';
import { pluginJob } from './pluginJob.ts';

export const pluginJobQueue = z
  .strictObject({
    jobId: z.string().optional(),
    priority: z.int().optional(),
    payload: pluginJob.optional(),
    state: z.enum(['wait', 'processing']).optional(),
    createdAt: dateField().nullable().optional(),
    updatedAt: dateField().nullable().optional(),
    startedAt: dateField().nullable().optional()
  })
  .describe('Represents plug-in job queue.');
