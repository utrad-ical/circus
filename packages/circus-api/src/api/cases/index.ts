import status from 'http-status';
import { extractFilter, performAggregationSearch } from '../performSearch';
import checkFilter from '../../utils/checkFilter';
import { RouteMiddleware, CircusContext } from '../../typings/middlewares';
import makeNewCase from '../../case/makeNewCase';
import {
  CaseExportTarget,
  CompressionFormat,
  LabelPackType,
  LineEndingType
} from '../../case/createMhdPacker';

const maxTagLength = 32;

const maskPatientInfo = (ctx: CircusContext) => {
  return (caseData: any) => {
    const wantToView = ctx.user.preferences.personalInfoView;
    if (!wantToView || caseData.patientInfo === null) {
      delete caseData.patientInfo;
    }
    return caseData;
  };
};

const isPatientInfoInFilter = (customFilter: { [key: string]: any }) => {
  const checkKeyVal = (key: string, value: any) => {
    if (key === '$and' || key === '$or') {
      return value.some((item: object) => isPatientInfoInFilter(item));
    } else {
      return /^patientInfo/.test(key);
    }
  };

  if (Object.keys(customFilter).length === 0) return false;
  return Object.keys(customFilter).every(key =>
    checkKeyVal(key, customFilter[key])
  );
};

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    delete aCase.latestRevision; // Remove redundant data
    ctx.body = maskPatientInfo(ctx)(aCase);
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const project = await models.project.findByIdOrFail(
      ctx.request.body.projectId
    );
    const caseId = await makeNewCase(
      models,
      ctx.user,
      ctx.userPrivileges,
      project,
      ctx.request.body.series,
      ctx.request.body.tags
    );
    ctx.body = { caseId };
    ctx.status = status.CREATED;
  };
};

export const handlePostRevision: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    const rev = ctx.request.body;

    if (rev.date) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision date.');
    }
    if (rev.creator) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision creator.');
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

    // const domainFilter = {};
    const patientInfoInFilter = isPatientInfoInFilter(customFilter!);
    const accessibleProjectIds = ctx.userPrivileges.accessibleProjects
      .filter(
        p =>
          p.roles.includes('read') &&
          (!patientInfoInFilter || p.roles.includes('viewPersonalInfo'))
      )
      .map(p => p.projectId);
    const patientInfoVisibleProjectIds = ctx.userPrivileges.accessibleProjects
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
              { $in: ['$projectId', patientInfoVisibleProjectIds] },
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

export const handlePostExportJob: RouteMiddleware = ({
  taskManager,
  mhdPacker,
  models
}) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const caseIds: CaseExportTarget[] = ctx.request.body.caseIds;
    const labelPackType: LabelPackType =
      ctx.request.body.labelPackType === 'combined' ? 'combined' : 'isolated';
    const mhdLineEnding: LineEndingType =
      ctx.request.body.mhdLineEnding === 'crlf' ? 'crlf' : 'lf';
    const compressionFormat: CompressionFormat =
      ctx.request.body.compressionFormat === 'zip' ? 'zip' : 'tgz';

    const ids = Array.from(
      new Set(caseIds.map(i => (typeof i === 'string' ? i : i.caseId))).values()
    );

    // check read privileges
    const cursor = models.clinicalCase.findAsCursor({ caseId: { $in: ids } });
    const pidSet = new Set<string>();
    while (await cursor.hasNext()) {
      const c = await cursor.next();
      pidSet.add(c.projectId);
    }
    const projectIds = Array.from(pidSet.values());
    const { accessibleProjects } = ctx.userPrivileges;
    for (const projectId of projectIds) {
      const project = accessibleProjects.find(p => p.projectId === projectId);
      if (!project || project.roles.indexOf('read') < 0) {
        ctx.throw(
          status.UNAUTHORIZED,
          'You do not have enough read privilege.'
        );
      }
    }

    const target = caseIds.length === 1 ? 'a case' : `${caseIds.length} cases`;
    const { emitter, downloadFileStream } = await taskManager.register(ctx, {
      name: `Export ${target} as MHD`,
      userEmail,
      downloadFileType:
        compressionFormat === 'tgz' ? 'application/x-tgz' : 'application/zip'
    });
    mhdPacker.packAsMhd(emitter, downloadFileStream!, caseIds, {
      labelPackType,
      mhdLineEnding,
      compressionFormat
    });
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

export const handleDelete: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const caseId = ctx.params.caseId;
    const urlQuery = ctx.request.query;
    if (urlQuery.force === '1') {
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
    } else {
      const isInMyList = await models.myList
        .findAsCursor({ 'items.resourceId': caseId })
        .hasNext();
      if (isInMyList) {
        ctx.throw(403, `This case is in someone's my list.`);
      }
      await models.clinicalCase.deleteOne({ caseId });
      ctx.body = null;
    }
  };
};
