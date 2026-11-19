import type { z } from 'zod';
import type {
  caseDetail,
  caseSearchResult,
  clinicalCaseCreate
} from './clinicalCase.ts';
import type { groupCreate, groupDoc } from './group.ts';
import type { icon } from './icon.ts';
import type { attributeSchema, jsonSchemaSubset } from './jsonSchemaSubset.ts';
import type { label } from './label.ts';
import type { loginInfo, loginInfoFull } from './loginInfo.ts';
import type { myListResourceType } from './myList.ts';
import type { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';
import type { patientInfo } from './patientInfo.ts';
import type { permanentToken } from './permanentToken.ts';
import type { pluginDoc } from './plugin.ts';
import type { pluginJobDoc, pluginJobSearchResult } from './pluginJob.ts';
import type {
  pluginJobFeedback,
  pluginJobFeedbackCreate
} from './pluginJobFeedback.ts';
import type { pluginJobManager } from './pluginJobManager.ts';
import type { preferences } from './preferences.ts';
import type { projectCreate, projectDoc } from './project.ts';
import type { revision, revisionCreate } from './revision.ts';
import type {
  caseCreated,
  caseExportMhdQuery,
  caseTags,
  caseTagsPatch,
  globalPrivileges,
  myListCreate,
  myListItemsPatch,
  myListItemsPatched,
  myListPatch,
  pluginJobCreate,
  pluginJobCreated,
  pluginJobPatch,
  progressCreated,
  seriesExportCsVolumeQuery,
  sessionCreate,
  tokenCreate,
  tokenCreated
} from './routes.ts';
import type { seriesForUser, seriesImportSummary } from './series.ts';
import type { userCreate, userForAdmin, userPublic } from './user.ts';
import type { userMyList } from './userMyList.ts';

// JSON uses the input side of codecs, including dates sent as strings.
export type LoginInfo = z.input<typeof loginInfo>;
export type LoginInfoFull = z.input<typeof loginInfoFull>;
export type SessionCreate = z.input<typeof sessionCreate>;
export type UserPreferences = z.input<typeof preferences>;
export type UserPublic = z.input<typeof userPublic>;
export type UserForAdmin = z.input<typeof userForAdmin>;
export type UserCreate = z.input<typeof userCreate>;

export type Group = z.input<typeof groupDoc>;
export type GroupCreate = z.input<typeof groupCreate>;
export type GlobalPrivileges = z.input<typeof globalPrivileges>;
export type Project = z.input<typeof projectDoc>;
export type ProjectCreate = z.input<typeof projectCreate>;
export type IconDefinition = z.input<typeof icon>;
export type AttributeSchema = z.input<typeof attributeSchema>;
export type AttributesSchema = z.input<typeof jsonSchemaSubset>;

export type MyList = z.input<typeof userMyList>;
export type MyListResourceType = z.input<typeof myListResourceType>;
export type MyListCreate = z.input<typeof myListCreate>;
export type MyListPatch = z.input<typeof myListPatch>;
export type MyListItemsPatch = z.input<typeof myListItemsPatch>;
export type MyListItemsPatched = z.input<typeof myListItemsPatched>;

export type Series = z.input<typeof seriesForUser>;
export type PartialVolumeDescriptor = z.input<typeof partialVolumeDescriptor>;
export type PatientInfo = z.input<typeof patientInfo>;
export type SeriesImportSummary = z.input<typeof seriesImportSummary>;
export type SeriesExportCsVolumeQuery = z.input<
  typeof seriesExportCsVolumeQuery
>;

export type CaseDetail = z.input<typeof caseDetail>;
export type CaseSearchItem = z.input<typeof caseSearchResult>;
export type CaseCreated = z.input<typeof caseCreated>;
export type CaseCreate = z.input<typeof clinicalCaseCreate>;
export type CaseTags = z.input<typeof caseTags>;
export type CaseTagsPatch = z.input<typeof caseTagsPatch>;
export type CaseExportMhdQuery = z.input<typeof caseExportMhdQuery>;
export type CaseRevision = z.input<typeof revision>;
export type CaseRevisionCreate = z.input<typeof revisionCreate>;
export type CaseLabel = z.input<typeof label>;

export type Plugin = z.input<typeof pluginDoc>;
export type PluginJob = z.input<typeof pluginJobDoc>;
export type PluginJobSearchItem = z.input<typeof pluginJobSearchResult>;
export type PluginJobCreate = z.input<typeof pluginJobCreate>;
export type PluginJobCreated = z.input<typeof pluginJobCreated>;
export type PluginJobPatch = z.input<typeof pluginJobPatch>;
export type PluginJobFeedback = z.input<typeof pluginJobFeedback>;
export type PluginJobFeedbackCreate = z.input<typeof pluginJobFeedbackCreate>;
export type PluginJobManager = z.input<typeof pluginJobManager>;

export type ProgressCreated = z.input<typeof progressCreated>;

export type ProgressLogLevel = 'info' | 'warn' | 'error';

export interface ProgressLogLine {
  level: ProgressLogLevel;
  message: string;
}

/** The `type` is sent as the server-sent event name. */
export type ProgressEvent =
  | { type: 'progress'; message: string; finished?: number; total?: number }
  | { type: 'log'; lines: ProgressLogLine[] }
  | { type: 'finish' | 'error'; message: string };

export type PermanentToken = z.input<typeof permanentToken>;
export type TokenCreate = z.input<typeof tokenCreate>;
export type TokenCreated = z.input<typeof tokenCreated>;
