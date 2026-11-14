import { z } from 'zod';
import { revision } from './revision.ts';

export const clinicalCase = z.strictObject({
  caseId: z.string().optional().describe('Randomly-generated case ID.'),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  latestRevision: revision.optional(),
  revisions: z.array(revision).optional(),
  domains: z.array(z.string()).optional()
});
