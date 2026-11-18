import { httpError } from '../../../middleware/errorHandler.ts';
import status from 'http-status';
import { globalPrivileges } from '../../../privilegeUtils.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import performSearch from '../../performSearch.ts';

export const handleSearch: RouteMiddleware<typeof routes.getGroups> = ({
  models
}) => {
  return async (ctx, json) => {
    return json(
      await performSearch(models.group, {}, ctx, {
        defaultSort: { groupId: 1 },
        allowUnlimited: true
      })
    );
  };
};

export const handleGet: RouteMiddleware<typeof routes.getGroup> = ({
  models
}) => {
  return async (ctx, json) => {
    const groupId = parseInt(ctx.req.param().groupId);
    const group = await models.group.findByIdOrFail(groupId);
    return json(group);
  };
};

const permissionsDependencies = {
  writeProjects: ['readProjects'],
  viewPersonalInfoProjects: ['readProjects'],
  moderateProjects: ['readProjects'],
  addSeriesProjects: ['readProjects'],
  executePlugin: ['readPlugin'],
  manageJobs: ['readPlugin'],
  inputPersonalFeedback: ['readPlugin'],
  inputConsensualFeedback: ['readPlugin'],
  manageFeedback: ['readPlugin'],
  viewPersonalInfo: ['readPlugin']
};

const checkPermissionsConsistency = (permissions: any) => {
  for (const [permission, dependencies] of Object.entries(
    permissionsDependencies
  )) {
    const ids = permissions[permission] || [];

    for (const dependency of dependencies) {
      const dependentIds = permissions[dependency] || [];

      const inconsistentIds = ids.filter(
        (id: any) => !dependentIds.includes(id)
      );
      if (inconsistentIds.length > 0) {
        throw new Error(
          `All items with ${permission} must have ${dependency}. Inconsistent IDs: ${inconsistentIds.join(
            ', '
          )}`
        );
      }
    }
  }
};

export const handlePatch: RouteMiddleware<typeof routes.patchGroup> = ({
  models
}) => {
  return async ctx => {
    try {
      checkPermissionsConsistency(ctx.req.valid('json'));
    } catch (err: any) {
      throw httpError(status.BAD_REQUEST, err.message);
    }
    const groupId = parseInt(ctx.req.param().groupId);
    await models.group.modifyOne(groupId, ctx.req.valid('json'));
    return ctx.body(null, 204);
  };
};

export const handlePost: RouteMiddleware<typeof routes.postGroup> = ({
  models
}) => {
  return async (ctx, json) => {
    const groupId = await models.group.newSequentialId();
    const inserting = { ...ctx.req.valid('json'), groupId };
    await models.group.insert(inserting);
    return json({ groupId }, status.CREATED);
  };
};

export const listGlobalPrivileges: RouteMiddleware<
  typeof routes.getGlobalPrivileges
> = () => {
  return async (ctx, json) => {
    return json(globalPrivileges());
  };
};
