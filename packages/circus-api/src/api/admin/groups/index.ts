import status from 'http-status';
import performSearch from '../../performSearch';
import { globalPrivileges } from '../../../privilegeUtils';
import { RouteMiddleware } from '../../../typings/middlewares';

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.group, {}, ctx, { defaultSort: { groupId: 1 } });
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const groupId = parseInt(ctx.params.groupId);
    const group = await models.group.findByIdOrFail(groupId);
    ctx.body = group;
  };
};

export const handlePut: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
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
  };
};

export const listGlobalPrivileges: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = globalPrivileges();
  };
};
