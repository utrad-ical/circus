import { z } from 'zod';
import { revision } from './revision.ts';

export const clinicalCaseSearchResult = z
  .strictObject({
    caseId: z.string().optional().describe('Randomly-generated case ID.'),
    projectId: z.string().optional(),
    patientInfo: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    latestRevision: revision.optional(),
    domains: z.array(z.string()).optional()
  })
  .describe('A case returned by the search endpoints (without revisions).');
