import status from 'http-status';
import { Readable } from 'node:stream';
import type { PreparedExport } from '../../case/createMhdPacker.ts';
import { ValidationError } from '../../createValidator.ts';
import { caseExportMhdQuery } from '../../schemas/routes.ts';
import checkRevisionAttributes from '../../case/checkRevisionAttributes.ts';
import makeNewCase from '../../case/makeNewCase.ts';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import { z } from 'zod';
import { clinicalCaseDoc } from '../../schemas/clinicalCase.ts';
import { dateField } from '../../schemas/formats.ts';
import { fieldsOf, mongoFilter } from '../../schemas/mongoFilter.ts';
import { seriesDoc } from '../../schemas/series.ts';
import resolveAutoPvdOfSeries from '../../utils/resolveAutoPvdOfSeries.ts';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch.ts';

/**
 * Removes the patient info joined in a search result
 * unless the user can and wants to see it.
 */
const maskPatientInfo = (ctx: CircusContext) => {
  const show =
    ctx.userPrivileges.globalPrivileges.includes('personalInfoView') &&
    ctx.user.preferences.personalInfoView;
  return <T extends { patientInfo?: unknown }>(caseData: T) => {
    if (show && caseData.patientInfo !== null) return caseData;
    const { patientInfo, ...rest } = caseData;
    return rest;
  };
};

export const handleGet: RouteMiddleware<typeof routes.getCase> = () => {
  return async (ctx, next) => {
    const { latestRevision, ...aCase } = ctx.case; // Redundant data
    ctx.body = aCase;
  };
};

export const handlePost: RouteMiddleware<typeof routes.postCase> = ({
  transactionManager,
  seriesOrientationResolver
}) => {
  return async (ctx, next) => {
    await transactionManager.withTransaction(async models => {
      const project = await models.project.findByIdOrFail(
        ctx.request.body.projectId
      );
      const caseId = await makeNewCase(
        models,
        ctx.user,
        ctx.userPrivileges,
        project,
        await resolveAutoPvdOfSeries(
          ctx.request.body.series,
          models,
          seriesOrientationResolver
        ),
        ctx.request.body.tags
      );
      ctx.body = { caseId };
      ctx.status = status.CREATED;
    });
  };
};

export const handlePostRevision: RouteMiddleware<
  typeof routes.postRevision
> = ({ models, blobStorage }) => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    const issues = checkRevisionAttributes(ctx.project, ctx.request.body);
    if (issues.length) {
      const err = new ValidationError(issues);
      err.phase = 'request';
      throw err;
    }

    const blobIds = ctx.request.body.series.flatMap(s =>
      s.labels.flatMap(l =>
        l.type === 'voxel' && l.data.voxels !== null ? [l.data.voxels] : []
      )
    );
    const missingBlobIds = (
      await Promise.all(
        blobIds.map(async id => (!(await blobStorage.exists(id)) ? id : null))
      )
    ).filter(id => id !== null);
    if (missingBlobIds.length) {
      ctx.throw(
        status.BAD_REQUEST,
        `Some voxel data are missing (${missingBlobIds.join(
          ', '
        )}). Store them first.`
      );
    }

    const rev = {
      ...ctx.request.body,
      date: new Date(),
      creator: ctx.user.userEmail
    };

    await models.clinicalCase.modifyOne(aCase.caseId, {
      latestRevision: rev,
      revisions: [...aCase.revisions, rev]
    });
    ctx.body = null;
    ctx.status = status.CREATED;
  };
};

const caseFilter = mongoFilter({
  ...fieldsOf(clinicalCaseDoc, ['projectId', 'caseId', 'tags']),
  ...fieldsOf(seriesDoc, [
    'patientInfo.patientId',
    'patientInfo.patientName',
    'patientInfo.age',
    'patientInfo.sex'
  ]),
  createdAt: dateField(),
  updatedAt: dateField()
});

export const handleSearch: RouteMiddleware<typeof routes.searchCases> = ({
  models
}) => {
  return async (ctx, next) => {
    const customFilter = extractFilter(ctx, caseFilter);

    const canViewPersonalInfo =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      ctx.throw(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const accessibleProjectIds = ctx.userPrivileges.accessibleProjects
      .filter(p => p.roles.includes('read'))
      .map(p => p.projectId);

    const canViewPersonalInfoProjectIds = ctx.userPrivileges.accessibleProjects
      .filter(
        p => p.roles.includes('read') && p.roles.includes('viewPersonalInfo')
      )
      .map(p => p.projectId);

    const accessibleProjectFilter = {
      projectId: { $in: accessibleProjectIds }
    };

    const filter = {
      $and: [customFilter, accessibleProjectFilter /* domainFilter */]
    };

    const myListId = ctx.params.myListId;
    const user = ctx.user;

    if (myListId) {
      const myList = user.myLists.find(
        (list: any) => myListId === list.myListId
      );
      if (!myList) ctx.throw(status.NOT_FOUND, 'This my list does not exist');

      if (myList.resourceType !== 'clinicalCases')
        ctx.throw(status.BAD_REQUEST, 'This my list is not for cases');
    }

    const baseStage: object[] = [
      {
        $lookup: {
          from: 'series',
          localField: 'revisions.series.seriesUid',
          foreignField: 'seriesUid',
          as: 'seriesDetail'
        }
      },
      { $unwind: { path: '$seriesDetail', includeArrayIndex: 'volId' } },
      { $match: { volId: 0 } },
      {
        $addFields: {
          patientInfo: {
            $cond: [
              { $in: ['$projectId', canViewPersonalInfoProjectIds] },
              '$seriesDetail.patientInfo',
              null
            ]
          }
        }
      }
    ];

    const searchByMyListStage: object[] = [
      { $match: { myListId } },
      { $unwind: { path: '$items' } },
      {
        $lookup: {
          from: 'clinicalCases',
          localField: 'items.resourceId',
          foreignField: 'caseId',
          as: 'caseDetail'
        }
      },
      {
        $replaceWith: {
          $mergeObjects: [
            { $arrayElemAt: ['$caseDetail', 0] },
            { addedToListAt: '$items.createdAt' }
          ]
        }
      }
    ];

    const lookupStages = myListId
      ? [...searchByMyListStage, ...baseStage]
      : baseStage;
    const startModel = myListId ? models.myList : models.clinicalCase;

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
            revisions: false,
            seriesDetail: false,
            volId: false,
            addedToListAt: false
          }
        }
      ],
      { defaultSort, transform: maskPatientInfo(ctx) }
    );
  };
};

export const handleGetExportMhd: RouteMiddleware<typeof routes.exportMhd> = ({
  mhdPacker,
  progressManager,
  validator
}) => {
  return async ctx => {
    // Errors before the download, including invalid queries,
    // are also shown in the progress
    const { progressId } = ctx.request.query;
    const reporter =
      typeof progressId === 'string'
        ? progressManager.claim(progressId, ctx.user.userEmail)
        : undefined;
    let query: any;
    let prepared: PreparedExport;
    try {
      try {
        query = await validator.validate(
          caseExportMhdQuery,
          ctx.request.query,
          'decode'
        );
      } catch (err: any) {
        err.phase = 'request';
        throw err;
      }
      const caseIds: string[] = Array.from(new Set(query.caseIds));
      prepared = await mhdPacker.prepare(
        caseIds.map(caseId => ({ caseId, revisionIndex: query.revisionIndex })),
        !!query.fullOriginalVolume
      );
      const { accessibleProjects } = ctx.userPrivileges;
      for (const { caseData } of prepared.cases) {
        const project = accessibleProjects.find(
          p => p.projectId === caseData.projectId
        );
        if (!project || !project.roles.includes('read')) {
          ctx.throw(
            status.UNAUTHORIZED,
            'You do not have enough read privilege for some cases.'
          );
        }
      }
    } catch (err: any) {
      reporter?.fail(
        err.expose || err instanceof ValidationError
          ? err.message
          : 'An internal error occurred.'
      );
      throw err;
    }

    const stream = mhdPacker.pack(
      prepared,
      { ...query, fullOriginalVolume: !!query.fullOriginalVolume },
      reporter
    );
    const zip = query.compressionFormat === 'zip';
    ctx.attachment(zip ? 'case-export.zip' : 'case-export.tar.gz');
    ctx.type = zip ? 'application/zip' : 'application/gzip';
    const body = Readable.fromWeb(stream as any);
    // Koa leaves the response open when the stream fails after the headers
    body.once('error', () => ctx.res.destroy());
    ctx.body = body;
  };
};

export const handlePutTags: RouteMiddleware<typeof routes.putTags> = ({
  models
}) => {
  return async (ctx, next) => {
    await models.clinicalCase.modifyOne(ctx.case.caseId, {
      tags: ctx.request.body
    });
    ctx.body = null; // No Content
  };
};

export const handlePatchTags: RouteMiddleware<typeof routes.patchTags> = ({
  models
}) => {
  return async (ctx, next) => {
    const { operation, tags, caseIds } = ctx.request.body;

    // first, ensure we have write access to all cases
    const writableProjectIds = ctx.userPrivileges.accessibleProjects
      .filter(p => p.roles.indexOf('write') >= 0)
      .map(p => p.projectId);
    for (const caseId of caseIds) {
      const aCase = await models.clinicalCase.findById(caseId);
      if (!aCase) ctx.throw(status.NOT_FOUND, 'Some case does not exist');
      if (writableProjectIds.indexOf(aCase.projectId) < 0) {
        ctx.throw(
          status.UNAUTHORIZED,
          'You do not have write access to some of the specified cases.'
        );
      }
    }
    const updateOp =
      operation === 'add'
        ? { $addToSet: { tags: { $each: tags } } }
        : operation === 'remove'
          ? { $pull: { tags: { $in: tags } } }
          : { $set: { tags: tags } };
    await models.clinicalCase.unsafe_updateMany(
      { caseId: { $in: caseIds } },
      updateOp
    );
    ctx.body = null;
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteCase> = ({
  transactionManager
}) => {
  return async (ctx, next) => {
    const caseId = ctx.params.caseId;
    const urlQuery = ctx.request.query;
    if (urlQuery.force === '1') {
      await transactionManager.withTransaction(async models => {
        const targetMyLists = await models.myList.findAll({
          'items.resourceId': caseId
        });
        for (const targetMyList of targetMyLists) {
          const newItems = targetMyList.items.filter(
            (i: any) => i.resourceId !== caseId
          );
          await models.myList.modifyOne(targetMyList.myListId, {
            items: newItems
          });
        }
        await models.clinicalCase.deleteOne({ caseId });
        ctx.body = null;
      });
    } else {
      await transactionManager.withTransaction(async models => {
        const isInMyList = await models.myList
          .findAsCursor({ 'items.resourceId': caseId })
          .hasNext();
        if (isInMyList) {
          ctx.throw(403, `This case is in someone's my list.`);
        }
        await models.clinicalCase.deleteOne({ caseId });
        ctx.body = null;
      });
    }
  };
};
