import fs from 'fs';
import glob from 'glob-promise';
import status from 'http-status';
import mime from 'mime';
import path from 'path';
import makeNewPluginJob from '../../plugin-job/makeNewPluginJob';
import { CircusContext, RouteMiddleware } from '../../typings/middlewares';
import checkFilter from '../../utils/checkFilter';
import generateUniqueId from '../../utils/generateUniqueId';
import resolveAutoPvdOfSeries, {
  AutoPvdSeriesEntry
} from '../../utils/resolveAutoPvdOfSeries';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch';
import { FilterQuery } from 'mongodb';

const maskPatientInfo = (ctx: CircusContext) => {
  return (pluginJobData: any) => {
    const canView =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');
    const wantToView = ctx.user.preferences.personalInfoView;
    if (!canView || !wantToView || pluginJobData.patientInfo === null) {
      delete pluginJobData.patientInfo;
    }
    if (Array.isArray(pluginJobData.patientInfo)) {
      pluginJobData.patientInfo = pluginJobData.patientInfo[0];
    }
    pluginJobData.domain = pluginJobData.domain[0];
    return pluginJobData;
  };
};

export interface PluginJobSeriesRequest extends AutoPvdSeriesEntry {
  requiredPrivateTags?: string;
}

interface RawPluginJobRequest {
  priority?: number;
  pluginId: string;
  series: PluginJobSeriesRequest[];
  force?: boolean;
}

export const handlePost: RouteMiddleware = ({
  transactionManager,
  cs,
  seriesOrientationResolver
}) => {
  return async (ctx, next) => {
    const { priority, pluginId, series, force } = ctx.request
      .body as RawPluginJobRequest;
    await transactionManager.withTransaction(async models => {
      const resolvedSeries = await resolveAutoPvdOfSeries(
        series,
        models,
        seriesOrientationResolver
      );
      const jobId = await makeNewPluginJob(
        models,
        { pluginId, series: resolvedSeries, force },
        ctx.userPrivileges,
        ctx.user.userEmail,
        cs,
        priority
      );
      ctx.body = { jobId };
      ctx.status = status.CREATED;
    });
  };
};

/**
 * Cancels or invalidates a job.
 */
export const handlePatch: RouteMiddleware = ({ transactionManager, cs }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const newStatus = ctx.request.body.status as 'cancelled' | 'invalidated';
    await transactionManager.withTransaction(async models => {
      const jobDoc = await models.pluginJob.findByIdOrFail(jobId);
      const pluginId = jobDoc.pluginId;

      if (
        newStatus === 'invalidated' &&
        !ctx.userPrivileges.accessiblePlugins.some(
          p => p.roles.includes('manageJobs') && p.pluginId === pluginId
        )
      ) {
        ctx.throw(401, `You do not have permission to invalidate this job.`);
      }

      const job = await models.pluginJob.findByIdOrFail(jobId);
      if (
        (newStatus === 'cancelled' && job.status !== 'in_queue') ||
        (newStatus === 'invalidated' && job.status !== 'finished')
      ) {
        const verb = newStatus === 'cancelled' ? 'cancel' : 'invalidate';
        ctx.throw(
          status.UNPROCESSABLE_ENTITY,
          `You cannot ${verb} this job because its status is "${job.status}".`
        );
      }
      if (newStatus === 'cancelled') {
        const deleted = await cs.job.removeFromQueue(jobId);
        if (!deleted) {
          ctx.throw(
            status.UNPROCESSABLE_ENTITY,
            'You cannot cancel this job because it is already being processed.'
          );
        }
      }
      await models.pluginJob.modifyOne(jobId, { status: newStatus });
    });
    ctx.status = status.NO_CONTENT;
  };
};

const searchableFields = [
  'pluginId',
  'jobId',
  'status',
  'patientInfo.patientId',
  'patientInfo.patientName',
  'patientInfo.age',
  'patientInfo.sex',
  'seriesUid',
  'studyUid',
  'seriesDate',
  'modality',
  'createdAt',
  'updatedAt',
  'finishedAt'
];

type CustomFilter<T = any> = FilterQuery<T>;

/**
 * Identifies and collects filters with fixed value in patientInfo.patientId or
 * patientInfo.patientName. Recursively extracts filters starting with "patientInfo."
 * for use in subsequent steps to obtain a list of seriesUid, enabling query
 * optimization through pre-filtering and result limitation.
 */
export const extractPatientIdNameFilter = (
  customFilter: CustomFilter
): CustomFilter | null => {
  if (!customFilter || customFilter.$or) return null;

  const targetFilter = ['patientInfo.patientId', 'patientInfo.patientName'];

  // A function that recursively collects filters starting with "patientInfo."
  const collectPatientInfoFilters = (
    filter: CustomFilter
  ): Record<string, any>[] => {
    const patientInfoFilters: Record<string, any>[] = [];

    if (filter.$and && Array.isArray(filter.$and)) {
      filter.$and.forEach(subCondition => {
        patientInfoFilters.push(...collectPatientInfoFilters(subCondition));
      });
    } else {
      const key = Object.keys(filter)[0];
      if (key && key.startsWith('patientInfo.')) {
        patientInfoFilters.push(filter);
      }
    }

    return patientInfoFilters;
  };

  // CustomFilter does not have $and
  if (!customFilter.$and) {
    const key = Object.keys(customFilter)[0];
    if (!key || !targetFilter.includes(key)) return null;

    const value = customFilter[key];
    if (typeof value !== 'object' || '$eq' in value) return customFilter;

    return null;
  }

  // Recursively collects filters starting with "patientInfo."
  const patientInfoFilters = collectPatientInfoFilters(customFilter);
  const includeFixedValue = patientInfoFilters.some(condition => {
    const key = Object.keys(condition)[0];
    return (
      targetFilter.includes(key) &&
      (typeof condition[key] !== 'object' || '$eq' in condition[key])
    );
  });

  return includeFixedValue ? { $and: patientInfoFilters } : null;
};

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const customFilter = extractFilter(ctx);
    if (!checkFilter(customFilter!, searchableFields))
      ctx.throw(status.BAD_REQUEST, 'Bad filter.');

    const canViewPersonalInfo =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      ctx.throw(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const domainFilter = {
      domain: { $in: ctx.userPrivileges.domains }
    };

    const extractedPatientInfoFilter = extractPatientIdNameFilter(customFilter);
    const targetSeries = extractedPatientInfoFilter
      ? await models.series.findAll(extractedPatientInfoFilter)
      : null;
    const targetSeriesUids = targetSeries
      ? targetSeries.map(doc => doc.seriesUid)
      : null;
    const accessiblePluginIds = ctx.userPrivileges.accessiblePlugins
      .filter(p => p.roles.includes('readPlugin'))
      .map(p => p.pluginId);
    const accessiblePluginFilter = {
      pluginId: { $in: accessiblePluginIds }
    };
    const filter = {
      $and: [customFilter!, domainFilter]
    };

    const canViewPersonalInfoPluginIds = ctx.userPrivileges.accessiblePlugins
      .filter(
        p =>
          p.roles.includes('readPlugin') && p.roles.includes('viewPersonalInfo')
      )
      .map(p => p.pluginId);

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

    const baseStage: object[] = [
      {
        $match: accessiblePluginFilter
      },
      {
        $lookup: {
          from: 'series',
          localField: 'series.seriesUid',
          foreignField: 'seriesUid',
          as: 'seriesInfo'
        }
      },
      {
        $addFields: {
          patientInfo: {
            $cond: [
              { $in: ['$pluginId', canViewPersonalInfoPluginIds] },
              '$seriesInfo.patientInfo',
              null
            ]
          },
          seriesUid: '$series.seriesUid',
          studyUid: '$seriesInfo.studyUid',
          seriesDate: '$seriesInfo.seriesDate',
          modality: '$seriesInfo.modality',
          domain: '$seriesInfo.domain'
        }
      }
    ];

    targetSeriesUids &&
      baseStage.unshift({
        $match: { 'series.seriesUid': { $in: targetSeriesUids } }
      });

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

    let sortQuery;
    if (ctx.query.sort) {
      try {
        sortQuery = JSON.parse(
          Array.isArray(ctx.query.sort) ? ctx.query.sort[0] : ctx.query.sort
        );
      } catch (e) {
        ctx.throw(status.BAD_REQUEST, 'Invalid sort parameter.');
      }
    } else if (ctx.query.sort !== undefined) {
      ctx.throw(status.BAD_REQUEST, 'Invalid sort parameter.');
    }
    if (sortQuery && sortQuery.createdAt) {
      baseStage.unshift({ $sort: sortQuery });
      sortQuery = [];
    }

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
            seriesInfo: false,
            seriesUid: false,
            studyUid: false,
            modality: false,
            seriesDate: false,
            addedToListAt: false,
            primarySeriesUid: false
          }
        }
      ],
      {
        defaultSort,
        transform: maskPatientInfo(ctx),
        sort: sortQuery,
        maxCount: 10000
      }
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
    } catch (err: any) {
      if (err.code === 'ENOENT') ctx.throw(status.NOT_FOUND);
      throw err;
    }
  };
};

export const handlePostFeedback: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const jobId = ctx.params.jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    const isConsensual = ctx.request.url.split('/')[4] === 'consensual';

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

export const handleDeleteFeedback: RouteMiddleware = ({
  transactionManager
}) => {
  return async (ctx, next) => {
    await transactionManager.withTransaction(async models => {
      const { jobId, feedbackId } = ctx.params;
      const job = await models.pluginJob.findByIdOrFail(jobId);

      // Throw 404 if feedbackId is not found
      if (
        feedbackId !== 'all' &&
        !job.feedbacks.find((f: any) => f.feedbackId === feedbackId)
      ) {
        ctx.throw(status.NOT_FOUND, 'Feedback not found.');
      }

      // Throw 400 if deleting personal feedback when consensual feedback exists
      if (
        feedbackId !== 'all' &&
        job.feedbacks.find((f: any) => f.isConsensual) &&
        job.feedbacks.find((f: any) => f.feedbackId === feedbackId)
          ?.isConsensual === false
      ) {
        ctx.throw(
          status.BAD_REQUEST,
          'Cannot delete personal feedback when consensual feedback exists.'
        );
      }

      const newList =
        feedbackId === 'all'
          ? []
          : job.feedbacks.filter((f: any) => feedbackId !== f.feedbackId); // TODO: fix type
      await models.pluginJob.modifyOne(jobId, { feedbacks: newList });
      ctx.body = null;
    });
  };
};
