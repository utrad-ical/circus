import status from 'http-status';
import { extractFilter, performAggregationSearch } from '../performSearch';
import generateUniqueId from '../../utils/generateUniqueId';
import path from 'path';
import fs from 'fs';
import glob from 'glob-promise';
import mime from 'mime';
import { RouteMiddleware, CircusContext } from '../../typings/middlewares';
import makeNewPluginJob from '../../plugin-job/makeNewPluginJob';

const maskPatientInfo = (ctx: CircusContext) => {
  return (pluginJobData: any) => {
    const canView =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');
    const wantToView = ctx.user.preferences.personalInfoView;
    if (!canView || !wantToView || pluginJobData.patientInfo === null) {
      delete pluginJobData.patientInfo;
    }
    return pluginJobData;
  };
};

export const handlePost: RouteMiddleware = ({ models, cs }) => {
  return async (ctx, next) => {
    const { priority, ...request } = ctx.request.body;

    const jobId = await makeNewPluginJob(
      models,
      request,
      ctx.userPrivileges,
      ctx.user.userEmail,
      cs,
      priority
    );

    ctx.body = { jobId };
    ctx.status = status.CREATED;
  };
};

/**
 * Cancels a job.
 */
export const handlePatch: RouteMiddleware = ({ models, cs }) => {
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

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const customFilter = extractFilter(ctx);
    const domainFilter = {
      domain: { $in: ctx.userPrivileges.domains }
    };
    const filter = { $and: [customFilter!, domainFilter] };

    const myListId = ctx.params.myListId;
    const user = ctx.user;

    if (myListId) {
      const myList = user.myLists.find(
        (list: any) => myListId === list.myListId
      );
      if (!myList) ctx.throw(status.NOT_FOUND, 'This my list does not exist');

      if (myList.resourceType !== 'pluginJobs')
        ctx.throw(status.BAD_REQUEST, 'This my list is not for plugin jobs');
    }

    const canViewPersonalInfo =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');

    const baseStage: object[] = [
      {
        $lookup: {
          from: 'series',
          localField: 'series.seriesUid',
          foreignField: 'seriesUid',
          as: 'seriesDetail'
        }
      },
      {
        $unwind: {
          path: '$seriesDetail',
          includeArrayIndex: 'volId'
        }
      },
      {
        $match: { volId: 0 }
      },
      {
        $addFields: {
          // Conditionally appends "patientInfo" field
          ...(canViewPersonalInfo
            ? { patientInfo: '$seriesDetail.patientInfo' }
            : {}),
          domain: '$seriesDetail.domain'
        }
      }
    ];

    const searchByMyListStage: object[] = [
      { $match: { myListId } },
      { $unwind: { path: '$items' } },
      {
        $lookup: {
          from: 'pluginJobs',
          localField: 'items.resourceId',
          foreignField: 'jobId',
          as: 'pluginJobDetail'
        }
      },
      {
        $replaceWith: {
          $mergeObjects: [
            { $arrayElemAt: ['$pluginJobDetail', 0] },
            { addedToListAt: '$items.createdAt' }
          ]
        }
      }
    ];

    const startModel = myListId ? models.myList : models.pluginJob;
    const lookupStages = myListId
      ? [...searchByMyListStage, ...baseStage]
      : baseStage;
    const defaultSort = myListId ? { addedToListAt: -1 } : { createdAt: -1 };

    await performAggregationSearch(
      startModel,
      filter,
      ctx,
      lookupStages,
      [
        {
          $project: {
            _id: false,
            volId: false,
            results: false,
            primarySeries: false,
            seriesDetail: false,
            addedToListAt: false
          }
        }
      ],
      { defaultSort, transform: maskPatientInfo(ctx) }
    );
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    ctx.body = job;
  };
};

export const handleGetAttachmentList: RouteMiddleware = ({
  models,
  pluginResultsPath
}) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const baseDir = path.resolve(pluginResultsPath, jobId);
    await models.pluginJob.findByIdOrFail(jobId);
    const files = await glob(baseDir + '/**/*');
    const relatives = files.map(p => path.relative(baseDir, p));
    ctx.body = relatives;
  };
};

export const handleGetAttachment: RouteMiddleware = ({
  models,
  pluginResultsPath
}) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const filePath = ctx.params.path;
    const baseDir = path.resolve(pluginResultsPath, jobId);
    const file = path.resolve(baseDir, filePath);
    if (path.relative(baseDir, file).match(/\.\.(\/|\\)/)) {
      ctx.throw(status.BAD_REQUEST, 'Invalid path prameter.');
    }

    await models.pluginJob.findByIdOrFail(jobId);

    const stream = fs.createReadStream(file);

    try {
      await new Promise<void>((resolve, reject) => {
        stream.once('readable', resolve); // file opened
        stream.once('error', reject);
      });
      ctx.type = mime.getType(file) || 'application/octet-stream';
      ctx.body = stream;
    } catch (err) {
      if (err.code === 'ENOENT') ctx.throw(status.NOT_FOUND);
      throw err;
    }
  };
};

export const handlePostFeedback: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);

    const mode = ctx.params.mode;
    if (mode !== 'personal' && mode !== 'consensual') {
      ctx.throw(status.BAD_REQUEST, 'Invalid feedback mode string.');
    }
    const isConsensual = mode === 'consensual';

    const feedbacks = job.feedbacks as any[]; // TODO: Fix typing
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

    const { data, actionLog } = ctx.request.body;

    const feedbackId = generateUniqueId();
    const item = {
      feedbackId,
      userEmail: ctx.user.userEmail,
      isConsensual,
      createdAt: new Date(),
      data,
      actionLog
    };
    await models.pluginJob.modifyOne(jobId, {
      feedbacks: [...job.feedbacks, item]
    });
    ctx.body = { feedbackId };
  };
};

export const handleGetFeedback: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    ctx.body = job.feedbacks;
  };
};

export const handleDeleteFeedback: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const { jobId, feedbackId } = ctx.params;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    const newList =
      feedbackId === 'all'
        ? []
        : job.feedbacks.filter((f: any) => feedbackId !== f.feedbackId); // TODO: fix type
    await models.pluginJob.modifyOne(jobId, { feedbacks: newList });
    ctx.body = null;
  };
};
