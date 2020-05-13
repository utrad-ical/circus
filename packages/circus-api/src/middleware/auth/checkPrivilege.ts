import status from 'http-status';
import { Models } from '../../interface';
import { CircusMiddeware } from '../../typings/middlewares';

const wrap = (data: any) => {
  if (!data) return undefined;
  return Array.isArray(data) ? data : [data];
};

/**
 * Return a middleware that checks various kinds of privilege of the current user.
 */
const checkPrivilege: (
  deps: { models: Models },
  route: any
) => CircusMiddeware = ({ models }, route) => {
  const requiredGlobalPrivilege = wrap(route.requiredGlobalPrivilege);
  const requiredProjectPrivilege = wrap(route.requiredProjectPrivilege);
  const requiredSeriesDomainCheck = wrap(route.requiredSeriesDomainCheck);

  return async function checkPrivilege(ctx, next) {
    if (requiredGlobalPrivilege) {
      const { globalPrivileges } = ctx.userPrivileges;
      const okay = requiredGlobalPrivilege.every(rp =>
        globalPrivileges.some(pp => pp === rp)
      );
      if (!okay) {
        ctx.throw(
          status.UNAUTHORIZED,
          'You do not have sufficient privilege to access this resource.'
        );
      }
    }

    if (requiredProjectPrivilege) {
      let projectId: string;

      // Check project privilege either via caseId or directly via projectId
      if (ctx.params.caseId) {
        const caseId = ctx.params.caseId;
        ctx.case = await models.clinicalCase.findByIdOrFail(caseId);
        projectId = ctx.case.projectId;
      } else if (ctx.params.projectId) {
        projectId = ctx.params.projectId;
      } else {
        ctx.throw(
          status.BAD_REQUEST,
          'No project or case specified to check project privilege.'
        );
      }
      ctx.project = await models.project.findById(projectId!);

      const { accessibleProjects } = ctx.userPrivileges;
      let ok = true;
      const project = accessibleProjects.find(p => p.projectId === projectId);
      if (project) {
        ok = requiredProjectPrivilege.every(rp =>
          project.roles.some((r: any) => r === rp)
        );
      } else {
        ok = false;
      }
      if (!ok) {
        ctx.throw(
          status.UNAUTHORIZED,
          `You do not have "${requiredProjectPrivilege.join(
            ','
          )}" privilege of this project.`
        );
      }
    }

    if (requiredSeriesDomainCheck) {
      if (!ctx.params.jobId)
        ctx.throw(
          status.BAD_REQUEST,
          'No plugin-job specified to check project privilege.'
        );
      const jobId = ctx.params.jobId;
      const jobDoc = await models.pluginJob.findByIdOrFail(jobId);
      ctx.job = jobDoc;

      const uid = [];
      for (let i = 0; i < jobDoc.series.length; i++) {
        uid.push(jobDoc.series[i].seriesUid);
      }

      const { domains } = ctx.userPrivileges;

      const aggregateDomains = await models.series.aggregate([
        { $match: { seriesUid: { $in: uid } } },
        {
          $group: {
            _id: '$domain'
          }
        }
      ]);

      const seriesDomains = [];
      for (let d = 0; d < aggregateDomains.length; d++) {
        seriesDomains.push(...Object.values(aggregateDomains[d]));
      }

      const domainCheck = seriesDomains.every(sd =>
        domains.some(d => d === sd)
      );
      if (!domainCheck) {
        ctx.throw(
          status.UNAUTHORIZED,
          'You do not have privilege of this plugin-job.'
        );
      }
    }

    await next();
  };
};

export default checkPrivilege;
