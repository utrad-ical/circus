import { z } from 'zod';
import { dateField } from './formats.ts';
import { patientInfo } from './patientInfo.ts';
import { revision } from './revision.ts';
import { seriesEntryWithAutoPvd } from './seriesEntryWithAutoPvd.ts';

/** A case in the database */
export const clinicalCaseDoc = z
  .strictObject({
    caseId: z.string().describe('Randomly-generated case ID.'),
    projectId: z.string(),
    tags: z.array(z.string()),
    latestRevision: revision.describe(
      'A copy of the last revision, used for searching.'
    ),
    revisions: z.array(revision).min(1),
    domains: z.array(z.string()),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a case.');

/** A case returned by `GET /cases/:caseId` */
export const caseDetail = clinicalCaseDoc.omit({ latestRevision: true });

/**
 * A case returned by the search endpoints, without the revisions,
 * and with the patient info of the first series if the user can see it.
 */
export const caseSearchResult = clinicalCaseDoc
  .omit({ revisions: true })
  .extend({ patientInfo: patientInfo.optional() });

/** Creates a case */
export const clinicalCaseCreate = z.strictObject({
  projectId: z.string(),
  series: z.array(seriesEntryWithAutoPvd).min(1),
  tags: z.array(z.string()).default([])
});
