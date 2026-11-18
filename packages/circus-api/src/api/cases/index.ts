import { httpError } from '../../middleware/errorHandler.ts';
import status from 'http-status';
import loadMyList from '../../mylist/loadMyList.ts';
import type { PreparedExport } from '../../case/createMhdPacker.ts';
import { ValidationError } from '../../createValidator.ts';
import {
  caseExportMhdQuery,
  clinicalCaseDoc,
  seriesDoc
} from '@utrad-ical/circus-api-schema';
import { dateField } from '@utrad-ical/circus-api-schema/formats';
import checkRevisionAttributes from '../../case/checkRevisionAttributes.ts';
import makeNewCase from '../../case/makeNewCase.ts';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import { z } from 'zod';
import { fieldsOf, mongoFilter } from '../../schemas/mongoFilter.ts';
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
    ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView') &&
    ctx.var.user.preferences.personalInfoView;
  return <T extends { patientInfo?: unknown }>(caseData: T) => {
    if (show && caseData.patientInfo !== null) return caseData;
    const { patientInfo, ...rest } = caseData;
    return rest;
  };
};

export const handleGet: RouteMiddleware<typeof routes.getCase> = () => {
  return async (ctx, json) => {
    const { latestRevision, ...aCase } = ctx.var.clinicalCase; // Redundant data
    return json(aCase);
  };
};

export const handlePost: RouteMiddleware<typeof routes.postCase> = ({
  transactionManager,
  seriesOrientationResolver
}) => {
  return async (ctx, json) => {
    const body = ctx.req.valid('json');
    const caseId = await transactionManager.withTransaction(async models => {
      const project = await models.project.findByIdOrFail(body.projectId);
      return await makeNewCase(
        models,
        ctx.var.user,
        ctx.var.userPrivileges,
        project,
        await resolveAutoPvdOfSeries(
          body.series,
          models,
          seriesOrientationResolver
        ),
        body.tags
      );
    });
    return json({ caseId }, status.CREATED);
  };
};

export const handlePostRevision: RouteMiddleware<
  typeof routes.postRevision
> = ({ models, blobStorage }) => {
  return async ctx => {
    const aCase = ctx.var.clinicalCase;
    const issues = checkRevisionAttributes(
      ctx.var.project,
      ctx.req.valid('json')
    );
    if (issues.length) {
      const err = new ValidationError(issues);
      err.phase = 'request';
      throw err;
    }

    const blobIds = ctx.req
      .valid('json')
      .series.flatMap(s =>
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
      throw httpError(
        status.BAD_REQUEST,
        `Some voxel data are missing (${missingBlobIds.join(
          ', '
        )}). Store them first.`
      );
    }

    const rev = {
      ...ctx.req.valid('json'),
      date: new Date(),
      creator: ctx.var.user.userEmail
    };

    await models.clinicalCase.modifyOne(aCase.caseId, {
      latestRevision: rev,
      revisions: [...aCase.revisions, rev]
    });
    return ctx.body(null, 201);
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

export const handleSearch: RouteMiddleware<
  typeof routes.searchCases | typeof routes.searchCasesInMyList
> = ({ models }) => {
  return async (ctx, json) => {
    const customFilter = extractFilter(ctx, caseFilter);

    const canViewPersonalInfo =
      ctx.var.userPrivileges.globalPrivileges.includes('personalInfoView');

    if (!canViewPersonalInfo && isPatientInfoInFilter(customFilter))
      throw httpError(
        status.BAD_REQUEST,
        'You cannot search using patient information.'
      );

    const accessibleProjectIds = ctx.var.userPrivileges.accessibleProjects
      .filter(p => p.roles.includes('read'))
      .map(p => p.projectId);

    const canViewPersonalInfoProjectIds =
      ctx.var.userPrivileges.accessibleProjects
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

    const myListId = ctx.req.param('myListId');
    if (myListId) {
      const { list, readable } = await loadMyList(ctx, models, myListId);
      if (!readable)
        throw httpError(
          status.UNAUTHORIZED,
          'You cannot read the items of this my list.'
        );
      if (list.resourceType !== 'clinicalCases')
        throw httpError(status.BAD_REQUEST, 'This my list is not for cases');
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
              revisions: false,
              seriesDetail: false,
              volId: false,
              addedToListAt: false
            }
          }
        ],
        { defaultSort, transform: maskPatientInfo(ctx) }
      )
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
    const { progressId } = ctx.var.query;
    const reporter =
      typeof progressId === 'string'
        ? progressManager.claim(progressId, ctx.var.user.userEmail)
        : undefined;
    let query: any;
    let prepared: PreparedExport;
    try {
      try {
        query = await validator.validate(
          caseExportMhdQuery,
          ctx.var.query,
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
      const { accessibleProjects } = ctx.var.userPrivileges;
      for (const { caseData } of prepared.cases) {
        const project = accessibleProjects.find(
          p => p.projectId === caseData.projectId
        );
        if (!project || !project.roles.includes('read')) {
          throw httpError(
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
    return ctx.body(stream, 200, {
      'Content-Disposition': zip
        ? 'attachment; filename="case-export.zip"'
        : 'attachment; filename="case-export.tar.gz"',
      'Content-Type': zip ? 'application/zip' : 'application/gzip'
    });
  };
};

export const handlePutTags: RouteMiddleware<typeof routes.putTags> = ({
  models
}) => {
  return async ctx => {
    await models.clinicalCase.modifyOne(ctx.var.clinicalCase.caseId, {
      tags: ctx.req.valid('json')
    });
    return ctx.body(null, 204); // No Content
  };
};

export const handlePatchTags: RouteMiddleware<typeof routes.patchTags> = ({
  models
}) => {
  return async ctx => {
    const { operation, tags, caseIds } = ctx.req.valid('json');

    // first, ensure we have write access to all cases
    const writableProjectIds = ctx.var.userPrivileges.accessibleProjects
      .filter(p => p.roles.indexOf('write') >= 0)
      .map(p => p.projectId);
    for (const caseId of caseIds) {
      const aCase = await models.clinicalCase.findById(caseId);
      if (!aCase) throw httpError(status.NOT_FOUND, 'Some case does not exist');
      if (writableProjectIds.indexOf(aCase.projectId) < 0) {
        throw httpError(
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
    return ctx.body(null, 204);
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteCase> = ({
  transactionManager
}) => {
  return async ctx => {
    const caseId = ctx.req.param().caseId;
    const urlQuery = ctx.var.query;
    if (urlQuery.force === '1') {
      await transactionManager.withTransaction(async models => {
        const targetMyLists = await models.myList.findAll({
          'items.resourceId': caseId
        });
        for (const targetMyList of targetMyLists) {
          const items = targetMyList.items.filter(i => i.resourceId !== caseId);
          await models.myList.modifyOne(targetMyList.myListId, { items });
        }
        await models.clinicalCase.deleteOne({ caseId });
      });
    } else {
      await transactionManager.withTransaction(async models => {
        const isInMyList = await models.myList
          .findAsCursor({ 'items.resourceId': caseId })
          .hasNext();
        if (isInMyList) {
          throw httpError(403, `This case is in someone's my list.`);
        }
        await models.clinicalCase.deleteOne({ caseId });
      });
    }
    return ctx.body(null, 204);
  };
};
