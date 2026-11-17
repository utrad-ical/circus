// All the schemas used by the API routes and the models

export { clinicalCase } from './clinicalCase.ts';
export { clinicalCaseCreate } from './clinicalCaseCreate.ts';
export { clinicalCaseSearchResult } from './clinicalCaseSearchResult.ts';
export { globalPrivilege, groupCreate, groupDoc, groupPatch } from './group.ts';
export { icon } from './icon.ts';
export { jsonSchemaSubset } from './jsonSchemaSubset.ts';
export { label } from './label.ts';
export { myList } from './myList.ts';
export { myListEditor } from './myListEditor.ts';
export { onetimeUrlDoc } from './onetimeUrl.ts';
export { partialVolumeDescriptor } from './partialVolumeDescriptor.ts';
export { patientInfo } from './patientInfo.ts';
export { permanentToken } from './permanentToken.ts';
export { plugin } from './plugin.ts';
export { pluginJob } from './pluginJob.ts';
export { pluginJobFeedback } from './pluginJobFeedback.ts';
export { pluginJobManager } from './pluginJobManager.ts';
export { pluginJobQueue } from './pluginJobQueue.ts';
export { pluginJobSearchResult } from './pluginJobSearchResult.ts';
export { pluginJobSeries } from './pluginJobSeries.ts';
export { preferences } from './preferences.ts';
export { projectCreate, projectDoc, projectPatch } from './project.ts';
export { remotePlugin } from './remotePlugin.ts';
export { revision } from './revision.ts';
export { revisionSeriesEntry } from './revisionSeriesEntry.ts';
export { schemaEntry } from './schemaEntry.ts';
export { seriesDoc, seriesForUser, seriesImportSummary } from './series.ts';
export { seriesEntry } from './seriesEntry.ts';
export { seriesEntryWithAutoPvd } from './seriesEntryWithAutoPvd.ts';
export { serverParamDoc } from './serverParam.ts';
export { tokenDoc } from './token.ts';
export {
  userCreate,
  userDoc,
  userForAdmin,
  userPatch,
  userPublic
} from './user.ts';
export { userMyList } from './userMyList.ts';
export * from './routes.ts';
