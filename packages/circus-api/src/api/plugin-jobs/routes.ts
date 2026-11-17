import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { dbEntry, only, searchResult } from '../../schemas/derive.ts';
import {
  handleDeleteFeedback,
  handleGet,
  handleGetAttachment,
  handleGetAttachmentList,
  handleGetFeedback,
  handlePatch,
  handlePost,
  handlePostFeedback,
  handleSearch
} from './index.ts';
import {
  patientInfo,
  pluginJob,
  pluginJobCreate,
  pluginJobCreated,
  pluginJobFeedback,
  pluginJobFeedbacks,
  pluginJobPatch,
  pluginJobSearchResult
} from '../../schemas/index.ts';

export const postPluginJobs = defineRoute({
  verb: 'post',
  path: '/plugin-jobs',
  description: 'Creates a new plug-in job.',
  request: pluginJobCreate,
  response: pluginJobCreated
});

export const patchPluginJobsJobId = defineRoute({
  verb: 'patch',
  path: '/plugin-jobs/:jobId',
  description: 'Cancels or invalidates an existing plug-in job.',
  requiredPluginPrivilege: 'executePlugin',
  requiredSeriesDomainCheck: true,
  request: pluginJobPatch
});

export const getPluginJobs = defineRoute({
  verb: 'get',
  path: '/plugin-jobs',
  description: 'Performs search for the plug-in job.',
  response: searchResult(
    pluginJobSearchResult.extend({ patientInfo: patientInfo.optional() })
  )
});

export const getPluginJobsListMyListId = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/list/:myListId',
  description: 'Performs search based on a my list ID.',
  response: searchResult(
    pluginJobSearchResult.extend({ patientInfo: patientInfo.optional() })
  )
});

export const getPluginJobsJobId = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId',
  description: 'Returns the detail of the specified plug-in job.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true,
  response: dbEntry(pluginJob)
});

export const getPluginJobsJobIdAttachment = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/attachment',
  description: 'Return the list of attachments from the plug-in.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true
});

export const getPluginJobsJobIdAttachmentPath = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/attachment/:path+',
  description: 'Returns the specified file output from the plug-in.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true
});

export const postPluginJobsJobIdFeedbackConsensual = defineRoute({
  verb: 'post',
  path: '/plugin-jobs/:jobId/feedback/consensual',
  description:
    'Creates a new consensual feedback entry for the specified plug-in job.',
  requiredPluginPrivilege: 'inputConsensualFeedback',
  requiredSeriesDomainCheck: true,
  request: only(pluginJobFeedback, ['data', 'actionLog'])
});

export const postPluginJobsJobIdFeedbackPersonal = defineRoute({
  verb: 'post',
  path: '/plugin-jobs/:jobId/feedback/personal',
  description:
    'Creates a new personal feedback entry for the specified plug-in job.',
  requiredPluginPrivilege: 'inputPersonalFeedback',
  requiredSeriesDomainCheck: true,
  request: only(pluginJobFeedback, ['data', 'actionLog'])
});

export const getPluginJobsJobIdFeedback = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/feedback',
  description: 'Lists feedback entries for the specified plug-in job.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true,
  response: pluginJobFeedbacks
});

export const deletePluginJobsJobIdFeedbackFeedbackId = defineRoute({
  verb: 'delete',
  path: '/plugin-jobs/:jobId/feedback/:feedbackId',
  description: 'Removes feedback items.',
  requiredPluginPrivilege: 'manageFeedback',
  requiredSeriesDomainCheck: true
});

export default defineRouteGroup({
  name: 'Plugin Jobs',
  description: 'Creates and manages CIRCUS CS plug-in jobs.',
  routes: [
    route(postPluginJobs, handlePost),
    route(patchPluginJobsJobId, handlePatch),
    route(getPluginJobs, handleSearch),
    route(getPluginJobsListMyListId, handleSearch),
    route(getPluginJobsJobId, handleGet),
    route(getPluginJobsJobIdAttachment, handleGetAttachmentList),
    route(getPluginJobsJobIdAttachmentPath, handleGetAttachment),
    route(postPluginJobsJobIdFeedbackConsensual, handlePostFeedback),
    route(postPluginJobsJobIdFeedbackPersonal, handlePostFeedback),
    route(getPluginJobsJobIdFeedback, handleGetFeedback),
    route(deletePluginJobsJobIdFeedbackFeedbackId, handleDeleteFeedback)
  ]
});
