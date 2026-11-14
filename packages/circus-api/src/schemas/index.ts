import type { z } from 'zod';
import { api } from './api.ts';
import { clinicalCase } from './clinicalCase.ts';
import { clinicalCaseCreate } from './clinicalCaseCreate.ts';
import { clinicalCaseSearchResult } from './clinicalCaseSearchResult.ts';
import { group } from './group.ts';
import { icon } from './icon.ts';
import { jsonSchemaSubset } from './jsonSchemaSubset.ts';
import { label } from './label.ts';
import { myList } from './myList.ts';
import { myListEditor } from './myListEditor.ts';
import { onetimeUrl } from './onetimeUrl.ts';
import { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';
import { patientInfo } from './patientInfo.ts';
import { permanentToken } from './permanentToken.ts';
import { plugin } from './plugin.ts';
import { pluginJob } from './pluginJob.ts';
import { pluginJobFeedback } from './pluginJobFeedback.ts';
import { pluginJobManager } from './pluginJobManager.ts';
import { pluginJobQueue } from './pluginJobQueue.ts';
import { pluginJobSearchResult } from './pluginJobSearchResult.ts';
import { pluginJobSeries } from './pluginJobSeries.ts';
import { preferences } from './preferences.ts';
import { project } from './project.ts';
import { remotePlugin } from './remotePlugin.ts';
import { revision } from './revision.ts';
import { revisionSeriesEntry } from './revisionSeriesEntry.ts';
import { schemaEntry } from './schemaEntry.ts';
import { series } from './series.ts';
import { seriesEntry } from './seriesEntry.ts';
import { seriesEntryWithAutoPvd } from './seriesEntryWithAutoPvd.ts';
import { serverParam } from './serverParam.ts';
import { task } from './task.ts';
import { token } from './token.ts';
import { user } from './user.ts';
import { userMyList } from './userMyList.ts';
import * as routes from './routes.ts';

/**
 * All the schemas, keyed by the names used in the API manifests
 * and the model definitions.
 */
const schemas: Record<string, z.ZodType> = {
  api,
  clinicalCase,
  clinicalCaseCreate,
  clinicalCaseSearchResult,
  group,
  icon,
  jsonSchemaSubset,
  label,
  myList,
  myListEditor,
  onetimeUrl,
  partialVolumeDescriptor,
  patientInfo,
  permanentToken,
  plugin,
  pluginJob,
  pluginJobFeedback,
  pluginJobManager,
  pluginJobQueue,
  pluginJobSearchResult,
  pluginJobSeries,
  preferences,
  project,
  remotePlugin,
  revision,
  revisionSeriesEntry,
  schemaEntry,
  series,
  seriesEntry,
  seriesEntryWithAutoPvd,
  serverParam,
  task,
  token,
  user,
  userMyList,
  ...routes
};

export default schemas;
