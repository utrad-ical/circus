import status from 'http-status';
import performSearch from '../../performSearch.ts';
import generateUniqueId from '../../../utils/generateUniqueId.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleSearch: RouteMiddleware<typeof routes.getProjects> = ({
  models
}) => {
  return async (ctx, next) => {
    await performSearch(models.project, {}, ctx, {
      defaultSort: { updatedAt: -1 },
      allowUnlimited: true
    });
  };
};

export const handleGet: RouteMiddleware<typeof routes.getProject> = ({
  models
}) => {
  return async (ctx, next) => {
    const projectId = ctx.params.projectId;
    const project = await models.project.findByIdOrFail(projectId);
    ctx.body = project;
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchProject> = ({
  models
}) => {
  return async (ctx, next) => {
    const projectId = ctx.params.projectId;
    await models.project.modifyOne(projectId, ctx.request.body);
    ctx.body = null;
  };
};

export const handlePost: RouteMiddleware<typeof routes.postProject> = ({
  models
}) => {
  return async (ctx, next) => {
    const projectId = generateUniqueId();
    const inserting = { ...ctx.request.body, projectId };
    await models.project.insert(inserting);
    ctx.body = { projectId };
    ctx.status = status.CREATED;
  };
};
