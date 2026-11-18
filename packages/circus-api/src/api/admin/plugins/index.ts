import httpStatus from 'http-status';
import { z } from 'zod';
import performSearch, { extractFilter } from '../../performSearch.ts';
import { mongoFilter } from '../../../schemas/mongoFilter.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handlePatch: RouteMiddleware<typeof routes.patchPlugin> = ({
  models
}) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    await models.plugin.modifyOne(pluginId, ctx.request.body);
    ctx.body = null;
  };
};

const pluginFilter = mongoFilter({ type: z.enum(['CAD']) });

export const handleSearch: RouteMiddleware<typeof routes.searchPlugins> = ({
  models
}) => {
  return async (ctx, next) => {
    const filter = extractFilter(ctx, pluginFilter);
    await performSearch(models.plugin, filter, ctx, {
      defaultSort: { pluginId: 1 },
      allowUnlimited: true
    });
  };
};

export const handlePost: RouteMiddleware<typeof routes.postPlugin> = ({
  models
}) => {
  return async (ctx, next) => {
    await models.plugin.insert(ctx.request.body);
    ctx.status = httpStatus.CREATED;
  };
};
