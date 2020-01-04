import status from 'http-status';
import performSearch from '../../performSearch';
import generateUniqueId from '../../../utils/generateUniqueId';
import { RouteMiddleware } from '../../../typings/middlewares';

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.project, {}, ctx);
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const projectId = ctx.params.projectId;
    const project = await models.project.findByIdOrFail(projectId);
    ctx.body = project;
  };
};

export const handlePut: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const projectId = ctx.params.projectId;
    await models.project.modifyOne(projectId, ctx.request.body);
    ctx.body = null;
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const projectId = generateUniqueId();
    if ('projectId' in ctx.request.body) {
      ctx.throw(status.BAD_REQUEST, 'Project ID cannot be specified');
    }
    const inserting = { ...ctx.request.body, projectId };
    await models.project.insert(inserting);
    ctx.body = { projectId };
  };
};
