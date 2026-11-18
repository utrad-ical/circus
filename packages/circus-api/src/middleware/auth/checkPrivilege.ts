import { httpError } from '../errorHandler.ts';
import type { RouteDefinition } from '../../defineRoute.ts';
import status from 'http-status';
import type { Models } from '../../interface.ts';
import type { CircusMiddleware } from '../../typings/middlewares.ts';

const wrap = (data?: string | string[]) => {
  if (!data) return undefined;
  return Array.isArray(data) ? data : [data];
};

/**
 * Return a middleware that checks various kinds of privilege of the current user.
 */
const checkPrivilege: (
  deps: { models: Models },
  route: Partial<RouteDefinition>
) => CircusMiddleware = ({ models }, route) => {
  const requiredGlobalPrivilege = wrap(route.requiredGlobalPrivilege);
  const requiredProjectPrivilege = wrap(route.requiredProjectPrivilege);
  const requiredPluginPrivilege = wrap(route.requiredPluginPrivilege);
  const { requiredSeriesDomainCheck } = route;

  return async function checkPrivilege(ctx, next) {
    const {
      caseId,
      projectId: requestedProjectId,
      jobId,
      pluginId: requestedPluginId
    } = ctx.req.param() as Record<string, string | undefined>;
    if (requiredGlobalPrivilege) {
      const { globalPrivileges } = ctx.var.userPrivileges;
      const okay = requiredGlobalPrivilege.every(rp =>
        globalPrivileges.some(pp => pp === rp)
      );
      const failedPrivileges = requiredGlobalPrivilege.filter(
        rp => !globalPrivileges.some(pp => pp === rp)
      );
      if (!okay) {
        throw httpError(
          status.UNAUTHORIZED,
          `You do not have sufficient privilege to access this resource.${failedPrivileges.join(
            ','
          )}`
        );
      }
    }

    if (requiredProjectPrivilege) {
      let projectId: string;

      // Check project privilege either via caseId or directly via projectId
      if (caseId) {
        const clinicalCase = await models.clinicalCase.findByIdOrFail(caseId);
        ctx.set('clinicalCase', clinicalCase);
        projectId = clinicalCase.projectId;
      } else if (requestedProjectId) {
        projectId = requestedProjectId;
      } else {
        throw httpError(
          status.BAD_REQUEST,
          'No project or case specified to check project privilege.'
        );
      }
      ctx.set('project', await models.project.findById(projectId));

      const { accessibleProjects } = ctx.var.userPrivileges;
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
        throw httpError(
          status.UNAUTHORIZED,
          `You do not have "${requiredProjectPrivilege.join(
            ','
          )}" privilege of this project.`
        );
      }
    }

    if (requiredPluginPrivilege) {
      let pluginId: string;

      // Check plugin privilege either via jobId or directly via pluginId
      if (jobId) {
        const jobDoc = await models.pluginJob.findByIdOrFail(jobId);
        ctx.set('job', jobDoc);
        pluginId = jobDoc.pluginId;
      } else if (requestedPluginId) {
        pluginId = requestedPluginId;
      } else {
        throw httpError(
          status.BAD_REQUEST,
          'No plugin or job specified to check plugin privilege.'
        );
      }
      ctx.set('plugin', await models.plugin.findById(pluginId));

      const { accessiblePlugins } = ctx.var.userPrivileges;
      let ok = true;
      const plugin = accessiblePlugins.find(p => p.pluginId === pluginId);
      if (plugin) {
        ok = requiredPluginPrivilege.every(rp =>
          plugin.roles.some((r: any) => r === rp)
        );
      } else {
        ok = false;
      }
      if (!ok) {
        throw httpError(
          status.UNAUTHORIZED,
          `You do not have "${requiredPluginPrivilege.join(
            ','
          )}" privilege of this plugin.`
        );
      }
    }

    if (requiredSeriesDomainCheck) {
      if (!jobId)
        throw httpError(
          status.BAD_REQUEST,
          'No plugin-job specified to check project privilege.'
        );

      const jobDoc = await models.pluginJob.findByIdOrFail(jobId);
      // Assign jobDoc to ctx for future reference
      ctx.set('job', jobDoc);

      const jobSeriesUids = jobDoc.series.map((s: any) => s.seriesUid);
      const { domains: accessibleDomains } = ctx.var.userPrivileges;
      const jobSeriesDomains = (
        await models.series.aggregate([
          { $match: { seriesUid: { $in: jobSeriesUids } } },
          { $group: { _id: '$domain' } }
        ])
      ).map(doc => doc._id);

      const domainCheck = jobSeriesDomains.every(sd =>
        accessibleDomains.some(d => d === sd)
      );
      if (!domainCheck) {
        throw httpError(
          status.UNAUTHORIZED,
          'You do not have privilege to access this plugin-job.'
        );
      }
    }

    await next();
  };
};

export default checkPrivilege;
