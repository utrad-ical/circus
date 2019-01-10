import status from 'http-status';
import performSearch from '../performSearch';
import generateUniqueId from '../../utils/generateUniqueId';
import * as EJSON from 'mongodb-extjson';
import { fetchAccessibleSeries } from '../../privilegeUtils';

export const handlePost = ({ models, cs }) => {
  return async (ctx, next) => {
    const jobId = generateUniqueId();
    const { priority, ...request } = ctx.request.body;

    try {
      await fetchAccessibleSeries(models, ctx.userPrivileges, request.series);
    } catch (err) {
      ctx.throw(status.NOT_FOUND, err); // Todo: Is status.BAD_REQUEST more better?
    }

    let plugin;
    try {
      plugin = await cs.plugin.get(request.pluginId);
    } catch (err) {
      ctx.throw(status.NOT_IMPLEMENTED, err);
    }

    await cs.job.register(jobId, request, priority);
    await models.pluginJob.insert({
      jobId,
      pluginId: plugin.pluginId,
      pluginName: plugin.pluginName,
      pluginVersion: plugin.version,
      series: request.series,
      userEmail: ctx.user.userEmail,
      status: 'in_queue',
      errorMessage: null,
      results: null,
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
export const handlePatch = ({ models, cs }) => {
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
    ctx.throw(
      status.NOT_IMPLEMENTED,
      'Job cancel function is not implemented on current version.'
    );
    // await cs.job.cancel(jobId);
    // await models.pluginJob.upsert(jobId, { status: 'cancelled' });
    // ctx.body = status.NO_CONTENT;
  };
};

export const handleSearch = ({ models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;
    let customFilter;
    try {
      customFilter = urlQuery.filter ? EJSON.parse(urlQuery.filter) : {};
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Bad filter.');
    }
    await performSearch(models.pluginJob, customFilter, ctx);
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
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    const feedbackId = generateUniqueId();
    const item = {
      feedbackId,
      userEmail: ctx.user.userEmail,
      createdAt: new Date(),
      ...ctx.request.body
    };
    await models.pluginJob.modifyOne(jobId, {
      feedbacks: [...job.feedbacks, item]
    });
    ctx.body = { feedbackId };
  };
};

export const handleGetFeedback = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    ctx.body = job.feedbacks;
  };
};
