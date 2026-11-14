import { z } from 'zod';
import { dateField } from './formats.ts';
import { myListEditor } from './myListEditor.ts';

export const userMyList = z
  .strictObject({
    myListId: z.string(),
    resourceType: z.enum(['series', 'clinicalCases', 'pluginJobs']),
    name: z.string().min(1).max(64),
    public: z.boolean(),
    editors: z.array(myListEditor),
    createdAt: dateField()
  })
  .describe("Represents a user's sub-document for my list.");
