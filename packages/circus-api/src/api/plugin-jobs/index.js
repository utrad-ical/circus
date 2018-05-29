import status from 'http-status';
import performSearch from '../performSearch';
import { generateJobId } from '../../utils';
import * as jobManager from '../mockJobManager';

export const handlePost = ({ models }) => {
  return async (ctx, next) => {
    const jobId = generateJobId();
    const priority = ctx.request.body.priority;
    const request = ctx.request.body.request;
    await jobManager.registerJob(jobId, request, priority);
    await models.pluginJob.insert({
      jobId,
      status: 'in_queue',
      errorMessage: null,
      result: null,
      startedAt: null,
      finishedAt: null,
      ...request
    });
    ctx.body = { jobId };
  };
};

export const deletePost = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    await jobManager.cancelJob(jobId);
    await models.pluginJob.upsert(jobId, { status: 'cancelled' });
    ctx.body = status.NO_CONTENT;
  };
};

export const handleSearch = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.project, {}, ctx);
  };
};

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    ctx.body = job;
  };
};
