import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { z } from 'zod';
import { searchResultOf } from '../../schemas/derive.ts';
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
  pluginJobCreate,
  pluginJobCreated,
  pluginJobDoc,
  pluginJobFeedbackCreate,
  pluginJobFeedbacks,
  pluginJobPatch,
  pluginJobSearchResult
} from '@utrad-ical/circus-api-schema';

const feedbackCreated = z.strictObject({ feedbackId: z.string() });

export const postPluginJob = defineRoute({
  verb: 'post',
  path: '/plugin-jobs',
  description: 'Creates a new plug-in job.',
  request: pluginJobCreate,
  response: pluginJobCreated
});

export const patchPluginJob = defineRoute({
  verb: 'patch',
  path: '/plugin-jobs/:jobId',
  description: 'Cancels or invalidates an existing plug-in job.',
  requiredPluginPrivilege: 'executePlugin',
  requiredSeriesDomainCheck: true,
  request: pluginJobPatch
});

export const searchPluginJobs = defineRoute({
  verb: 'get',
  path: '/plugin-jobs',
  description: 'Performs search for the plug-in job.',
  response: searchResultOf(pluginJobSearchResult)
});

export const searchPluginJobsInMyList = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/list/:myListId',
  description: 'Performs search based on a my list ID.',
  response: searchResultOf(pluginJobSearchResult)
});

export const getPluginJob = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId',
  description: 'Returns the detail of the specified plug-in job.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true,
  response: pluginJobDoc
});

export const getAttachmentList = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/attachment',
  description: 'Return the list of attachments from the plug-in.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true,
  response: z.array(z.string())
});

export const getAttachment = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/attachment/:path{.+}',
  description: 'Returns the specified file output from the plug-in.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true
});

export const postConsensualFeedback = defineRoute({
  verb: 'post',
  path: '/plugin-jobs/:jobId/feedback/consensual',
  description:
    'Creates a new consensual feedback entry for the specified plug-in job.',
  requiredPluginPrivilege: 'inputConsensualFeedback',
  requiredSeriesDomainCheck: true,
  request: pluginJobFeedbackCreate,
  response: feedbackCreated
});

export const postPersonalFeedback = defineRoute({
  verb: 'post',
  path: '/plugin-jobs/:jobId/feedback/personal',
  description:
    'Creates a new personal feedback entry for the specified plug-in job.',
  requiredPluginPrivilege: 'inputPersonalFeedback',
  requiredSeriesDomainCheck: true,
  request: pluginJobFeedbackCreate,
  response: feedbackCreated
});

export const getFeedbacks = defineRoute({
  verb: 'get',
  path: '/plugin-jobs/:jobId/feedback',
  description: 'Lists feedback entries for the specified plug-in job.',
  requiredPluginPrivilege: 'readPlugin',
  requiredSeriesDomainCheck: true,
  response: pluginJobFeedbacks
});

export const deleteFeedback = defineRoute({
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
    route(postPluginJob, handlePost),
    route(patchPluginJob, handlePatch),
    route(searchPluginJobs, handleSearch),
    route(searchPluginJobsInMyList, handleSearch),
    route(getPluginJob, handleGet),
    route(getAttachmentList, handleGetAttachmentList),
    route(getAttachment, handleGetAttachment),
    route(postConsensualFeedback, handlePostFeedback(true)),
    route(postPersonalFeedback, handlePostFeedback(false)),
    route(getFeedbacks, handleGetFeedback),
    route(deleteFeedback, handleDeleteFeedback)
  ]
});
