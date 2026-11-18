import { z } from 'zod';
import { dateField, num } from './formats.ts';
import { myListEditor } from './myListEditor.ts';
import { pluginDoc } from './plugin.ts';
import { pluginJobFeedback } from './pluginJobFeedback.ts';
import { pluginJobSeries } from './pluginJobSeries.ts';
import { preferences } from './preferences.ts';
import { userMyList } from './userMyList.ts';

// Request and response schemas used by a single route.
// Objects without `additionalProperties: false` in the original
// JSON Schemas are kept loose.

const atLeastOneKey = (obj: object) => Object.keys(obj).length > 0;

export const onetimeUrlCreate = z.strictObject({ user: z.string() });

export const serverParams = z.record(z.string(), z.unknown());

export const caseExportMhdQuery = z
  .strictObject({
    caseIds: z
      .string()
      .transform(s => s.split(','))
      .pipe(z.array(z.string().min(1)).min(1).max(100)),
    revisionIndex: z
      .string()
      .regex(/^(0|[1-9][0-9]*)$/)
      .transform(Number)
      .optional(),
    fullOriginalVolume: z
      .literal('1')
      .transform(() => true)
      .optional(),
    labelPackType: z.enum(['isolated', 'combined']).default('isolated'),
    mhdLineEnding: z.enum(['lf', 'crlf']).default('lf'),
    compressionFormat: z.enum(['tgz', 'zip']).default('tgz'),
    progressId: z.string().optional()
  })
  .refine(q => q.revisionIndex === undefined || q.caseIds.length === 1, {
    message: 'revisionIndex requires exactly one case ID.',
    path: ['revisionIndex']
  });

const caseTag = z.string().max(32);

export const caseTags = z.array(caseTag);

export const caseTagsPatch = z
  .strictObject({
    operation: z.enum(['add', 'remove', 'set']),
    tags: z.array(caseTag).max(10),
    caseIds: z.array(z.string()).min(1).max(1000)
  })
  .refine(
    p => p.operation === 'set' || p.tags.length > 0,
    'You must specify at least one tag.'
  );

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

export const pluginJobCreated = z.strictObject({ jobId: z.string() });

export const pluginJobPatch = z.strictObject({
  status: z.enum(['cancelled', 'invalidated'])
});

export const pluginJobFeedbacks = z.array(pluginJobFeedback);

export const plugins = z.array(pluginDoc);

export const preferencesPatch = preferences.refine(
  atLeastOneKey,
  'At least one property is required'
);

export const seriesOrientation = z.strictObject({
  orientation: z.enum(['head-first', 'foot-first']).optional()
});

const int = z
  .string()
  .regex(/^-?(0|[1-9][0-9]*)$/)
  .transform(Number);

// `uid` or `uid:start:end:delta`
const csVolumeSeries = z
  .string()
  .transform(s => s.split(':'))
  .pipe(
    z.union([
      z.tuple([z.string().min(1)]),
      z.tuple([z.string().min(1), int, int, int])
    ])
  )
  .transform(([seriesUid, start, end, delta]) =>
    start === undefined ? { seriesUid } : { seriesUid, start, end, delta }
  )
  .refine(s => s.delta !== 0, { message: 'delta must not be 0.' });

export const seriesExportCsVolumeQuery = z.strictObject({
  series: z
    .string()
    .transform(s => s.split(','))
    .pipe(z.array(csVolumeSeries).min(1).max(10)),
  compressionFormat: z.enum(['tgz', 'zip']).default('tgz'),
  progressId: z.string().optional()
});

export const sessionCreate = z.union([
  z.strictObject({ username: z.string(), password: z.string() }),
  z.strictObject({ onetime: z.string() })
]);

export const tokenCreate = z.strictObject({
  description: z.string().min(1).max(32)
});

export const tokenCreated = z.strictObject({
  tokenId: z.string(),
  accessToken: z.string()
});
