import { z } from 'zod';
import { dateField } from './formats.ts';
import { patientInfo } from './patientInfo.ts';
import { pluginJobFeedback } from './pluginJobFeedback.ts';
import { seriesEntry } from './seriesEntry.ts';

export const pluginJobStatus = z
  .enum([
    'in_queue',
    'processing',
    'finished',
    'cancelled',
    'failed',
    'invalidated'
  ])
  .describe('The current status of this job.');

/**
 * A plug-in job in the database. CIRCUS CS (cs-core) also writes the
 * status, the results and the times directly, without this schema.
 */
export const pluginJobDoc = z
  .strictObject({
    jobId: z.string().describe('The unique ID of the job.'),
    pluginId: z.string(),
    userEmail: z.string(),
    status: pluginJobStatus,
    errorMessage: z
      .string()
      .nullable()
      .describe("Contains an error message if the status is 'failed'."),
    series: z
      .array(seriesEntry.extend({ requiredPrivateTags: z.string().optional() }))
      .min(1),
    feedbacks: z.array(pluginJobFeedback),
    startedAt: dateField().nullable().describe('Job start time.'),
    finishedAt: dateField().nullable().describe('Job finish time.'),
    results: z
      .record(z.string(), z.unknown())
      .nullable()
      .describe(
        'The results written by the plug-in (`results.json`), ' +
          'whose shape is defined by the plug-in and its displays.'
      ),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a CIRCUS CS plug-in job.');

/**
 * A plug-in job returned by the search endpoints, without the results,
 * and with the domain and the patient info of the first series.
 */
export const pluginJobSearchResult = pluginJobDoc
  .omit({ results: true })
  .extend({ domain: z.string(), patientInfo: patientInfo.optional() });
