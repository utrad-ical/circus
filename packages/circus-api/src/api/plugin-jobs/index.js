import status from 'http-status';
import performSearch from '../performSearch';
import { generateJobId } from '../../utils';
import * as jobManager from '../mockJobManager';

export const handlePost = ({ models }) => {
  return async (ctx, next) => {
    const jobId = generateJobId();
    const { priority, ...request } = ctx.request.body;
    await jobManager.registerJob(jobId, request, priority);
    await models.pluginJob.insert({
      jobId,
      pluginName: request.pluginName,
      pluginVersion: request.pluginVersion,
      series: request.series,
      userEmail: ctx.user.userEmail,
      status: 'in_queue',
      errorMessage: null,
      result: null,
      startedAt: null,
      feedbacks: [],
      finishedAt: null
    });
    ctx.body = { jobId };
  };
};

/**
 * Cancels a job.
 */
export const handlePatch = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    if (
      ctx.request.body.status !== 'cancelled' ||
      Object.keys(ctx.request.body).length !== 1
    ) {
      ctx.throw(status.BAD_REQUEST);
    }
    if (job.status !== 'in_queue') {
      ctx.throw(
        status.UNPROCESSABLE_ENTITY,
        `You cannot cancel this job because its status is "${job.status}".`
      );
    }
    await jobManager.cancelJob(jobId);
    await models.pluginJob.upsert(jobId, { status: 'cancelled' });
    ctx.body = status.NO_CONTENT;
  };
};

export const handleSearch = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.pluginJob, {}, ctx);
  };
};

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    ctx.body = job;
  };
};

export const handlePostFeedback = ({ models }) => {
  return async (ctx, next) => {
    ctx.throw(status.NOT_IMPLEMENTED);
  };
};

export const handleGetFeedback = ({ models }) => {
  return async (ctx, next) => {
    ctx.throw(status.NOT_IMPLEMENTED);
  };
};
