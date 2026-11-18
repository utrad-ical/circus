import status from 'http-status';
import performSearch from '../../performSearch.ts';
import generateUniqueId from '../../../utils/generateUniqueId.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleSearch: RouteMiddleware<typeof routes.getProjects> = ({
  models
}) => {
  return async (ctx, json) => {
    return json(
      await performSearch(models.project, {}, ctx, {
        defaultSort: { updatedAt: -1 },
        allowUnlimited: true
      })
    );
  };
};

export const handleGet: RouteMiddleware<typeof routes.getProject> = ({
  models
}) => {
  return async (ctx, json) => {
    const projectId = ctx.req.param().projectId;
    const project = await models.project.findByIdOrFail(projectId);
    return json(project);
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchProject> = ({
  models
}) => {
  return async ctx => {
    const projectId = ctx.req.param().projectId;
    await models.project.modifyOne(projectId, ctx.req.valid('json'));
    return ctx.body(null, 204);
  };
};

export const handlePost: RouteMiddleware<typeof routes.postProject> = ({
  models
}) => {
  return async (ctx, json) => {
    const projectId = generateUniqueId();
    const inserting = { ...ctx.req.valid('json'), projectId };
    await models.project.insert(inserting);
    return json({ projectId }, status.CREATED);
  };
};
