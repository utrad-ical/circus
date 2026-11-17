import status from 'http-status';
import { Readable } from 'node:stream';
import type { PreparedExport } from '../../case/createMhdPacker.ts';
import { ValidationError } from '../../createValidator.ts';
import { caseExportMhdQuery } from '../../schemas/routes.ts';
import makeNewCase from '../../case/makeNewCase.ts';
import type {
  CircusContext,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import checkFilter from '../../utils/checkFilter.ts';
import resolveAutoPvdOfSeries from '../../utils/resolveAutoPvdOfSeries.ts';
import {
  extractFilter,
  isPatientInfoInFilter,
  performAggregationSearch
} from '../performSearch.ts';

const maxTagLength = 32;

const maskPatientInfo = (ctx: CircusContext) => {
  return (caseData: any) => {
    const canViewPersonalInfo =
      ctx.userPrivileges.globalPrivileges.includes('personalInfoView');
    const wantToView = ctx.user.preferences.personalInfoView;
    if (!canViewPersonalInfo || !wantToView || caseData.patientInfo === null) {
      delete caseData.patientInfo;
    }
    return caseData;
  };
};

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    delete aCase.latestRevision; // Remove redundant data
    ctx.body = maskPatientInfo(ctx)(aCase);
  };
};

export const handlePost: RouteMiddleware = ({
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

export const handlePostRevision: RouteMiddleware = ({
  models,
  blobStorage
}) => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    const rev = ctx.request.body;

    if (rev.date) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision date.');
    }
    if (rev.creator) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision creator.');
    }

    const blobIds: string[] = rev.series
      .map((s: any) => {
        return s.labels
          .filter((l: any) => l.type === 'voxel' && l.data.voxels !== null)
          .map((l: any) => l.data.voxels);
      })
      .flat();
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

    rev.date = new Date();
    rev.creator = ctx.user.userEmail;

    await models.clinicalCase.modifyOne(aCase.caseId, {
      latestRevision: rev,
      revisions: [...aCase.revisions, rev]
    });
    ctx.body = null;
    ctx.status = status.CREATED;
  };
};

const searchableFields = [
  'projectId',
  'caseId',
  'patientInfo.patientId',
  'patientInfo.patientName',
  'patientInfo.age',
  'patientInfo.sex',
  'tags',
  'createdAt',
  'updatedAt'
];

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
      $and: [customFilter!, accessibleProjectFilter /* domainFilter */]
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

export const handleGetExportMhd: RouteMiddleware = ({
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

export const handlePutTags: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    const tags: string[] = ctx.request.body;
    if (tags.some(t => t.length > maxTagLength))
      ctx.throw(status.BAD_REQUEST, 'Tag length is too large');
    await models.clinicalCase.modifyOne(aCase.caseId, { tags });
    ctx.body = null; // No Content
  };
};

export const handlePatchTags: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const { operation, tags, caseIds } = ctx.request.body as {
      operation: 'add' | 'remove' | 'set';
      tags: string[];
      caseIds: string[];
    };
    if (caseIds.length > 1000)
      ctx.throw(status.BAD_REQUEST, 'Too many case IDs');
    if (tags.length > 10) ctx.throw(status.BAD_REQUEST, 'Too many tags.');
    if (operation !== 'set' && tags.length === 0)
      ctx.throw(status.BAD_REQUEST, 'You must specify at least one tag.');
    if (tags.some(t => t.length > maxTagLength))
      ctx.throw(status.BAD_REQUEST, 'The specified tag is too long.');

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

export const handleDelete: RouteMiddleware = ({ transactionManager }) => {
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
