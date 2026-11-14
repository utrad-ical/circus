import { z } from 'zod';
import { seriesEntryWithAutoPvd } from './seriesEntryWithAutoPvd.ts';

export const clinicalCaseCreate = z.strictObject({
  projectId: z.string().optional(),
  series: z.array(seriesEntryWithAutoPvd).min(1).optional(),
  tags: z.array(z.string()).optional()
});
