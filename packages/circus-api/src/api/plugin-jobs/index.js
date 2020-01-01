import status from 'http-status';
import performSearch from '../performSearch';
import generateUniqueId from '../../utils/generateUniqueId';
import { EJSON } from 'bson';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import { fetchAccessibleSeries } from '../../privilegeUtils';
import duplicateJobExists from '../duplicateJobExists';

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
      ctx.throw(status.NOT_FOUND, err);
    }

    if (await duplicateJobExists(models, request))
      ctx.throw(
        status.BAD_REQUEST,
        'There is a duplicate job that is already registered.'
      );

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

export const handleGetAttachment = ({ models, pluginResultsPath }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const filePath = ctx.params.path;
    if (!filePath || /\.\./.test(filePath)) {
      ctx.throw(status.BAD_REQUEST, 'Invalid path prameter.');
    }
    await models.pluginJob.findByIdOrFail(jobId);
    const file = path.join(pluginResultsPath, jobId, filePath);
    const read = fs.createReadStream(file);
    ctx.type = mime.getType(file) || 'application/octet-stream';
    ctx.body = read;
  };
};

export const handlePostFeedback = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);

    const mode = ctx.params.mode;
    if (mode !== 'personal' && mode !== 'consensual') {
      ctx.throw(status.BAD_REQUEST, 'Invalid feedback mode string.');
    }
    const isConsensual = mode === 'consensual';

    const feedbacks = job.feedbacks;
    if (feedbacks.find(f => f.isConsensual)) {
      ctx.throw(
        status.BAD_REQUEST,
        'A consensual feedback has been already registered.'
      );
    }

    if (
      !isConsensual &&
      feedbacks.find(f => !f.isConsensual && f.userEmail === ctx.user.userEmail)
    ) {
      ctx.throw(
        status.BAD_REQUEST,
        'Personal feedback of this user has been already registered.'
      );
    }

    const feedbackId = generateUniqueId();
    const item = {
      feedbackId,
      userEmail: ctx.user.userEmail,
      isConsensual,
      createdAt: new Date(),
      data: ctx.request.body
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

export const handleDeleteFeedback = ({ models }) => {
  return async (ctx, next) => {
    const { jobId, feedbackId } = ctx.params;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    const newList =
      feedbackId === 'all'
        ? []
        : job.feedbacks.filter(f => feedbackId !== f.feedbackId);
    await models.pluginJob.modifyOne(jobId, { feedbacks: newList });
    ctx.body = null;
  };
};
