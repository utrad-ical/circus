import status from 'http-status';
import {
  csRoleNames,
  dbRoleNames,
  globalPrivileges
} from '../../../privilegeUtils';
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

const checkPermissionsConsistency = (permissions: any) => {
  const readableProjectIds = permissions['readProjects'];
  for (const role of dbRoleNames.filter(r => r !== 'read')) {
    const projectIds = permissions[`${role}Projects`];
    if (projectIds) {
      console.log('projectIds', projectIds);
      for (const projectId of projectIds) {
        if (!readableProjectIds.includes(projectId)) {
          throw new Error(`All projects with ${role}Projects must be readable`);
        }
      }
    }
  }
  const readablePluginIds = permissions['readPlugin'];
  for (const role of csRoleNames.filter(r => r !== 'readPlugin')) {
    const pluginIds = permissions[role];
    if (pluginIds) {
      for (const pluginId of pluginIds) {
        if (!readablePluginIds.includes(pluginId)) {
          throw new Error(`All plugins with ${role} must be readable`);
        }
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
