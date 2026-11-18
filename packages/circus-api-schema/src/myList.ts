import { z } from 'zod';
import { dateField } from './formats.ts';
import { myListEditor } from './myListEditor.ts';

export const myListResourceType = z.enum([
  'series',
  'clinicalCases',
  'pluginJobs'
]);

/** A my list in the database, with its items */
export const myListDoc = z
  .strictObject({
    myListId: z.string(),
    ownerEmail: z.string().describe('The user who made this list.'),
    name: z.string().min(1).max(64),
    resourceType: myListResourceType,
    public: z.boolean().describe('Whether anyone can read the items.'),
    editors: z
      .array(myListEditor)
      .describe('The users and groups who can edit the items.'),
    items: z
      .array(
        z.strictObject({
          resourceId: z.string().describe('One of jobId, seriesUid, caseId'),
          createdAt: dateField()
        })
      )
      .max(1000),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a my list.');
