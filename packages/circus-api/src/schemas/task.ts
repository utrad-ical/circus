import { z } from 'zod';
import { dateField } from './formats.ts';

export const task = z.strictObject({
  taskId: z.string().optional(),
  userEmail: z.email().optional().describe('The user who started this task.'),
  name: z.string().optional().describe('Display name of the task.'),
  status: z.enum(['finished', 'error', 'processing']).optional(),
  errorMessage: z.string().nullable().optional(),
  finishedMessage: z.string().nullable().optional(),
  endedAt: dateField().nullable().optional(),
  downloadFileType: z
    .string()
    .nullable()
    .optional()
    .describe('MIME type of the file that can be downloaded.'),
  dismissed: z.boolean().optional()
});
