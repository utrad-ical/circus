import { z } from 'zod';
import { dateField, num } from './formats.ts';
import { myListEditor } from './myListEditor.ts';
import { plugin } from './plugin.ts';
import { pluginJobFeedback } from './pluginJobFeedback.ts';
import { pluginJobSeries } from './pluginJobSeries.ts';
import { preferences } from './preferences.ts';
import { remotePlugin } from './remotePlugin.ts';
import { seriesEntry } from './seriesEntry.ts';
import { userMyList } from './userMyList.ts';

// Request and response schemas used by a single route.
// Objects without `additionalProperties: false` in the original
// JSON Schemas are kept loose.

const atLeastOneKey = (obj: object) => Object.keys(obj).length > 0;

export const onetimeUrlCreate = z.strictObject({ user: z.string() });

export const serverParams = z.record(z.string(), z.unknown());

export const caseExportMhd = z.looseObject({
  caseIds: z
    .array(
      z.union([
        z.string(),
        z.looseObject({
          caseId: z.string().optional(),
          revisionIndex: z.int().min(0).optional()
        })
      ])
    )
    .max(100),
  labelPackType: z.enum(['isolated', 'combined']).optional(),
  mhdLineEnding: z.enum(['lf', 'crlf']).optional(),
  compressionFormat: z.enum(['tgz', 'zip']).optional()
});

export const caseTags = z.array(z.string());

export const caseTagsPatch = z.looseObject({
  operation: z.enum(['add', 'remove', 'set']),
  tags: z.array(z.string()),
  caseIds: z.array(z.string()).min(1)
});

export const myLists = z.array(userMyList);

export const myListCreate = z.looseObject({
  name: z.string().min(1).max(64),
  resourceType: z.enum(['series', 'clinicalCases', 'pluginJobs']),
  public: z.boolean()
});

export const myListCreated = z.looseObject({ myListId: z.string() });

export const myListPatch = z
  .strictObject({
    name: z.string().min(1).max(64).optional(),
    public: z.boolean().optional(),
    editors: z.array(myListEditor).optional()
  })
  .refine(atLeastOneKey, 'At least one property is required');

export const myListItemsPatch = z.looseObject({
  operation: z.enum(['add', 'remove']),
  resourceIds: z.array(z.string()).min(1).max(1000)
});

export const myListItemsPatched = z.looseObject({ changedCount: num() });

export const pluginJobCreate = z.strictObject({
  pluginId: z.string(),
  series: z.array(pluginJobSeries).min(1),
  priority: z.int().optional(),
  force: z.literal(true).optional()
});

export const pluginJobCreated = z.looseObject({ jobId: z.string() });

export const pluginJobPatch = z.strictObject({
  status: z.enum(['cancelled', 'invalidated'])
});

export const pluginJobFeedbacks = z.array(pluginJobFeedback);

const withDates = <T extends z.ZodObject>(schema: T) =>
  schema.extend({ createdAt: dateField(), updatedAt: dateField() });

export const plugins = z.array(
  z.union([withDates(plugin), withDates(remotePlugin)])
);

export const preferencesPatch = preferences.refine(
  atLeastOneKey,
  'At least one property is required'
);

export const seriesOrientation = z.strictObject({
  orientation: z.enum(['head-first', 'foot-first']).optional()
});

export const seriesExportCsVolume = z.looseObject({
  series: z.array(seriesEntry).min(1).max(10),
  compressionFormat: z.enum(['tgz', 'zip']).optional()
});

export const sessionCreate = z.union([
  z.strictObject({ username: z.string(), password: z.string() }),
  z.strictObject({ onetime: z.string() })
]);

export const tokenCreate = z.strictObject({
  description: z.string().min(1).max(32)
});

export const tokenCreated = z.looseObject({
  tokenId: z.string(),
  accessToken: z.string()
});
