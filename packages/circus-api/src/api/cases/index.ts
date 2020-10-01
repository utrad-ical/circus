import status from 'http-status';
import { performAggregationSearch } from '../performSearch';
import { EJSON } from 'bson';
import { packAsMhd } from '../../case/packAsMhd';
import checkFilter from '../../utils/checkFilter';
import { RouteMiddleware, CircusContext } from '../../typings/middlewares';
import makeNewCase from '../../case/makeNewCase';

const maskPatientInfo = (ctx: CircusContext) => {
  return (caseData: any) => {
    const wantToView = ctx.user.preferences.personalInfoView;
    const accessibleProjects = ctx.userPrivileges.accessibleProjects;
    const project = accessibleProjects.find(
      p => caseData.projectId === p.projectId
    );
    if (!project) {
      throw new Error(
        `Project ${caseData.projectId} is not accessbible by ${ctx.user.userEmail}.`
      );
    }
    const viewable = project.roles.some(r => r === 'viewPersonalInfo');
    const view = viewable && wantToView;
    if (!view) {
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
    ctx.body = null; // No Content
  };
};

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;
    let customFilter: object;
    try {
      customFilter = urlQuery.filter ? EJSON.parse(urlQuery.filter) : {};
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Invalid JSON was passed as the filter.');
    }
    const fields = [
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
    if (!checkFilter(customFilter!, fields))
      ctx.throw(status.BAD_REQUEST, 'Bad filter.');

    // const domainFilter = {};
    const patientInfoInFilter = isPatientInfoInFilter(customFilter!);
    const accessibleProjectIds = ctx.userPrivileges.accessibleProjects
      .filter(
        p =>
          p.roles.indexOf('read') >= 0 &&
          (!patientInfoInFilter || p.roles.indexOf('viewPersonalInfo') >= 0)
      )
      .map(p => p.projectId);
    const accessibleProjectFilter = {
      projectId: { $in: accessibleProjectIds }
    };
    const filter = {
      $and: [customFilter!, accessibleProjectFilter /* domainFilter */]
    };

    await performAggregationSearch(
      models.clinicalCase,
      filter,
      ctx,
      [
        {
          $lookup: {
            from: 'series',
            localField: 'revisions.series.seriesUid',
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
          $addFields: { patientInfo: '$seriesDetail.patientInfo' }
        }
      ],
      [
        {
          $project: {
            _id: false,
            seriesDetail: false,
            volId: false
          }
        }
      ],
      {
        defaultSort: { createdAt: -1 },
        transform: maskPatientInfo(ctx)
      }
    );
  };
};

export const handleExportAsMhd: RouteMiddleware = deps => {
  return async (ctx, next) => {
    const caseId = ctx.case.caseId;
    ctx.type = 'application/zip';
    ctx.body = await packAsMhd(deps, caseId);
  };
};
