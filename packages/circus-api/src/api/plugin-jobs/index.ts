import { httpError } from '../../middleware/errorHandler.ts';
import fs from 'fs';
import { Readable } from 'node:stream';
import glob from '../../utils/glob.ts';
import status from 'http-status';
import loadMyList from '../../mylist/loadMyList.ts';
import mime from 'mime';
import path from 'path';
import makeNewPluginJob from '../../plugin-job/makeNewPluginJob.ts';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import { pluginJobDoc, seriesDoc } from '@utrad-ical/circus-api-schema';
import { dateField } from '@utrad-ical/circus-api-schema/formats';
import type * as routes from './routes.ts';
import { fieldsOf, mongoFilter } from '../../schemas/mongoFilter.ts';
import generateUniqueId from '../../utils/generateUniqueId.ts';
import type { AutoPvdSeriesEntry } from '../../utils/resolveAutoPvdOfSeries.ts';
import resolveAutoPvdOfSeries from '../../utils/resolveAutoPvdOfSeries.ts';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch.ts';
import type { Filter } from 'mongodb';

/**
 * Takes the patient info and the domain of the first series joined in a
 * search result, and removes the patient info unless the user can see it.
 */
const maskPatientInfo = (ctx: CircusContext) => {
  const show =
    ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView') &&
    ctx.var.user.preferences.personalInfoView;
  return (job: any) => {
    const { patientInfo, domain, ...rest } = job;
    // `patientInfo` is null if the user cannot see it for the plug-in
    const info = Array.isArray(patientInfo) ? patientInfo[0] : patientInfo;
    return {
      ...rest,
      domain: domain[0],
      ...(show && info ? { patientInfo: info } : {})
    };
  };
};

export interface PluginJobSeriesRequest extends AutoPvdSeriesEntry {
  requiredPrivateTags?: string;
}

export const handlePost: RouteMiddleware<typeof routes.postPluginJob> = ({
  transactionManager,
  cs,
  seriesOrientationResolver
}) => {
  return async (ctx, json) => {
    const { priority, pluginId, series, force } = ctx.req.valid('json');
    // `checkPrivilege` cannot see the plug-in ID in the request body
    const canExecute = ctx.var.userPrivileges.accessiblePlugins.some(
      p => p.pluginId === pluginId && p.roles.includes('executePlugin')
    );
    if (!canExecute)
      throw httpError(
        status.UNAUTHORIZED,
        'You do not have "executePlugin" privilege of this plugin.'
      );
    const jobId = await transactionManager.withTransaction(async models => {
      const resolvedSeries = await resolveAutoPvdOfSeries(
        series,
        models,
        seriesOrientationResolver
      );
      return await makeNewPluginJob(
        models,
        { pluginId, series: resolvedSeries, force },
        ctx.var.userPrivileges,
        ctx.var.user.userEmail,
        cs,
        priority
      );
    });
    return json({ jobId }, status.CREATED);
  };
};

/**
 * Cancels or invalidates a job.
 */
export const handlePatch: RouteMiddleware<typeof routes.patchPluginJob> = ({
  transactionManager,
  cs
}) => {
  return async ctx => {
    const jobId = ctx.req.param().jobId;
    const newStatus = ctx.req.valid('json').status;
    await transactionManager.withTransaction(async models => {
      const job = await models.pluginJob.findByIdOrFail(jobId);

      if (
        newStatus === 'invalidated' &&
        !ctx.var.userPrivileges.accessiblePlugins.some(
          p => p.roles.includes('manageJobs') && p.pluginId === job.pluginId
        )
      ) {
        throw httpError(
          401,
          `You do not have permission to invalidate this job.`
        );
      }

      if (
        (newStatus === 'cancelled' && job.status !== 'in_queue') ||
        (newStatus === 'invalidated' && job.status !== 'finished')
      ) {
        const verb = newStatus === 'cancelled' ? 'cancel' : 'invalidate';
        throw httpError(
          status.UNPROCESSABLE_ENTITY,
          `You cannot ${verb} this job because its status is "${job.status}".`
        );
      }
      if (newStatus === 'cancelled') {
        const deleted = await cs.job.removeFromQueue(jobId);
        if (!deleted) {
          throw httpError(
            status.UNPROCESSABLE_ENTITY,
            'You cannot cancel this job because it is already being processed.'
          );
        }
      }
      await models.pluginJob.modifyOne(jobId, { status: newStatus });
    });
    return ctx.body(null, 204);
  };
};

const pluginJobFilter = mongoFilter({
  ...fieldsOf(pluginJobDoc, ['pluginId', 'jobId', 'status', 'finishedAt']),
  ...fieldsOf(seriesDoc, [
    'patientInfo.patientId',
    'patientInfo.patientName',
    'patientInfo.age',
    'patientInfo.sex',
    'seriesUid',
    'studyUid',
    'seriesDate',
    'modality'
  ]),
  createdAt: dateField(),
  updatedAt: dateField()
});

type CustomFilter<T = any> = Filter<T>;

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

export const handleSearch: RouteMiddleware<
  typeof routes.searchPluginJobs | typeof routes.searchPluginJobsInMyList
> = ({ models }) => {
  return async (ctx, json) => {
    const customFilter = extractFilter(ctx, pluginJobFilter);

    const canViewPersonalInfo =
      ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      throw httpError(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const domainFilter = {
      domain: { $in: ctx.var.userPrivileges.domains }
    };

    const extractedPatientInfoFilter = extractPatientIdNameFilter(customFilter);
    const targetSeries = extractedPatientInfoFilter
      ? await models.series.findAll(extractedPatientInfoFilter)
      : null;
    const targetSeriesUids = targetSeries
      ? targetSeries.map(doc => doc.seriesUid)
      : null;
    const accessiblePluginIds = ctx.var.userPrivileges.accessiblePlugins
      .filter(p => p.roles.includes('readPlugin'))
      .map(p => p.pluginId);
    const accessiblePluginFilter = {
      pluginId: { $in: accessiblePluginIds }
    };
    const filter = {
      $and: [customFilter, domainFilter]
    };

    const canViewPersonalInfoPluginIds =
      ctx.var.userPrivileges.accessiblePlugins
        .filter(
          p =>
            p.roles.includes('readPlugin') &&
            p.roles.includes('viewPersonalInfo')
        )
        .map(p => p.pluginId);

    const myListId = ctx.req.param('myListId');
    if (myListId) {
      const { list, readable } = await loadMyList(ctx, models, myListId);
      if (!readable)
        throw httpError(
          status.UNAUTHORIZED,
          'You cannot read the items of this my list.'
        );
      if (list.resourceType !== 'pluginJobs')
        throw httpError(
          status.BAD_REQUEST,
          'This my list is not for plugin jobs'
        );
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
    if (ctx.var.query.sort) {
      try {
        sortQuery = JSON.parse(
          Array.isArray(ctx.var.query.sort)
            ? ctx.var.query.sort[0]
            : ctx.var.query.sort
        );
      } catch (e) {
        throw httpError(status.BAD_REQUEST, 'Invalid sort parameter.');
      }
    } else if (ctx.var.query.sort !== undefined) {
      throw httpError(status.BAD_REQUEST, 'Invalid sort parameter.');
    }
    if (sortQuery && sortQuery.createdAt) {
      baseStage.unshift({ $sort: sortQuery });
      sortQuery = [];
    }

    return json(
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
      )
    );
  };
};

export const handleGet: RouteMiddleware<typeof routes.getPluginJob> = ({
  models
}) => {
  return async (ctx, json) => {
    const jobId = ctx.req.param().jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    return json(job);
  };
};

export const handleGetAttachmentList: RouteMiddleware<
  typeof routes.getAttachmentList
> = ({ models, pluginResultsPath }) => {
  return async (ctx, json) => {
    const jobId = ctx.req.param().jobId;
    const baseDir = path.resolve(pluginResultsPath, jobId);
    await models.pluginJob.findByIdOrFail(jobId);
    const files = await glob(baseDir + '/**/*');
    const relatives = files.map(p => path.relative(baseDir, p));
    return json(relatives);
  };
};

export const handleGetAttachment: RouteMiddleware<
  typeof routes.getAttachment
> = ({ models, pluginResultsPath }) => {
  return async ctx => {
    const jobId = ctx.req.param().jobId;
    const filePath = ctx.req.param().path;
    const baseDir = path.resolve(pluginResultsPath, jobId);
    const file = path.resolve(baseDir, filePath);
    if (path.relative(baseDir, file).match(/\.\.(\/|\\)/)) {
      throw httpError(status.BAD_REQUEST, 'Invalid path prameter.');
    }

    await models.pluginJob.findByIdOrFail(jobId);

    const stream = fs.createReadStream(file);

    try {
      await new Promise<void>((resolve, reject) => {
        stream.once('readable', resolve); // file opened
        stream.once('error', reject);
      });
      return ctx.body(
        Readable.toWeb(stream) as ReadableStream<Uint8Array>,
        200,
        {
          'Content-Type': mime.getType(file) || 'application/octet-stream'
        }
      );
    } catch (err: any) {
      if (err.code === 'ENOENT') throw httpError(status.NOT_FOUND);
      throw err;
    }
  };
};

export const handlePostFeedback =
  (
    isConsensual: boolean
  ): RouteMiddleware<
    typeof routes.postPersonalFeedback | typeof routes.postConsensualFeedback
  > =>
  ({ models }) => {
    return async (ctx, json) => {
      const jobId = ctx.req.param().jobId;
      const job = await models.pluginJob.findByIdOrFail(jobId);

      const feedbacks = job.feedbacks;
      if (feedbacks.find(f => f.isConsensual)) {
        throw httpError(
          status.BAD_REQUEST,
          'A consensual feedback has been already registered.'
        );
      }

      if (
        !isConsensual &&
        feedbacks.find(
          f => !f.isConsensual && f.userEmail === ctx.var.user.userEmail
        )
      ) {
        throw httpError(
          status.BAD_REQUEST,
          'Personal feedback of this user has been already registered.'
        );
      }

      const { data, actionLog } = ctx.req.valid('json');

      const feedbackId = generateUniqueId();
      const item = {
        feedbackId,
        userEmail: ctx.var.user.userEmail,
        isConsensual,
        createdAt: new Date(),
        data,
        actionLog
      };
      await models.pluginJob.modifyOne(jobId, {
        feedbacks: [...job.feedbacks, item]
      });
      return json({ feedbackId });
    };
  };

export const handleGetFeedback: RouteMiddleware<typeof routes.getFeedbacks> = ({
  models
}) => {
  return async (ctx, json) => {
    const jobId = ctx.req.param().jobId;
    const job = await models.pluginJob.findByIdOrFail(jobId);
    return json(job.feedbacks);
  };
};

export const handleDeleteFeedback: RouteMiddleware<
  typeof routes.deleteFeedback
> = ({ transactionManager }) => {
  return async ctx => {
    await transactionManager.withTransaction(async models => {
      const { jobId, feedbackId } = ctx.req.param();
      const job = await models.pluginJob.findByIdOrFail(jobId);

      // Throw 404 if feedbackId is not found
      if (
        feedbackId !== 'all' &&
        !job.feedbacks.find(f => f.feedbackId === feedbackId)
      ) {
        throw httpError(status.NOT_FOUND, 'Feedback not found.');
      }

      // Throw 400 if deleting personal feedback when consensual feedback exists
      if (
        feedbackId !== 'all' &&
        job.feedbacks.find(f => f.isConsensual) &&
        job.feedbacks.find(f => f.feedbackId === feedbackId)?.isConsensual ===
          false
      ) {
        throw httpError(
          status.BAD_REQUEST,
          'Cannot delete personal feedback when consensual feedback exists.'
        );
      }

      const newList =
        feedbackId === 'all'
          ? []
          : job.feedbacks.filter(f => feedbackId !== f.feedbackId);
      await models.pluginJob.modifyOne(jobId, { feedbacks: newList });
    });
    return ctx.body(null, 204);
  };
};
