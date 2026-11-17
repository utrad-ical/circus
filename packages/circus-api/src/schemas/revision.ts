import { z } from 'zod';
import { dateField } from './formats.ts';
import {
  revisionSeriesEntry,
  revisionSeriesEntryCreate
} from './revisionSeriesEntry.ts';

/** A revision of a case */
export const revision = z.strictObject({
  creator: z
    .string()
    .describe('The e-mail address of the creator of this revision.'),
  date: dateField().describe('When the revision was created.'),
  description: z.string(),
  attributes: z
    .record(z.string(), z.unknown())
    .describe('Case attributes defined by the project.'),
  status: z.string(),
  series: z.array(revisionSeriesEntry).min(1)
});

/** Creates a revision. The server sets the creator and the date. */
export const revisionCreate = revision
  .omit({ creator: true, date: true })
  .extend({ series: z.array(revisionSeriesEntryCreate).min(1) });
