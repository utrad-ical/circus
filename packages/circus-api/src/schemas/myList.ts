import { z } from 'zod';
import { dateField } from './formats.ts';

export const myList = z.strictObject({
  myListId: z.string().optional(),
  items: z
    .array(
      z.looseObject({
        resourceId: z.string().describe('One of jobId, seriesId, caseId'),
        createdAt: dateField()
      })
    )
    .max(1000)
    .optional()
});
