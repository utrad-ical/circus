import { z } from 'zod';
import { dateField } from './formats.ts';
import { revisionSeriesEntry } from './revisionSeriesEntry.ts';

export const revision = z.strictObject({
  creator: z
    .string()
    .optional()
    .describe('The e-mail address of the creator of this revision.'),
  date: dateField().optional().describe('When the revision was created.'),
  description: z.string().optional(),
  attributes: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Case attributes.'),
  status: z.string().optional(),
  series: z.array(revisionSeriesEntry).optional()
});
