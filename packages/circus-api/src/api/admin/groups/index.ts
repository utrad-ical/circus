import status from 'http-status';
import { globalPrivileges } from '../../../privilegeUtils';
import { RouteMiddleware } from '../../../typings/middlewares';
import performSearch from '../../performSearch';

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.group, {}, ctx, {
      defaultSort: { groupId: 1 },
      allowUnlimited: true
    });
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const groupId = parseInt(ctx.params.groupId);
    const group = await models.group.findByIdOrFail(groupId);
    ctx.body = group;
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

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    try {
      checkPermissionsConsistency(ctx.request.body);
    } catch (err: any) {
      ctx.throw(status.BAD_REQUEST, err.message);
    }
    const groupId = parseInt(ctx.params.groupId);
    await models.group.modifyOne(groupId, ctx.request.body);
    ctx.body = null;
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const groupId = await models.group.newSequentialId();
    if ('groupId' in ctx.request.body) {
      ctx.throw(status.BAD_REQUEST, 'Group ID cannot be specified');
    }
    const inserting = { ...ctx.request.body, groupId };
    await models.group.insert(inserting);
    ctx.body = { groupId };
    ctx.status = status.CREATED;
  };
};

export const listGlobalPrivileges: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = globalPrivileges();
  };
};
