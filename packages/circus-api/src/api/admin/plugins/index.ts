import { z } from 'zod';
import performSearch, { extractFilter } from '../../performSearch.ts';
import { mongoFilter } from '../../../schemas/mongoFilter.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handlePatch: RouteMiddleware<typeof routes.patchPlugin> = ({
  models
}) => {
  return async ctx => {
    const pluginId = ctx.req.param().pluginId;
    await models.plugin.modifyOne(pluginId, ctx.req.valid('json'));
    return ctx.body(null, 204);
  };
};

const pluginFilter = mongoFilter({ type: z.enum(['CAD']) });

export const handleSearch: RouteMiddleware<typeof routes.searchPlugins> = ({
  models
}) => {
  return async (ctx, json) => {
    const filter = extractFilter(ctx, pluginFilter);
    return json(
      await performSearch(models.plugin, filter, ctx, {
        defaultSort: { pluginId: 1 },
        allowUnlimited: true
      })
    );
  };
};

export const handlePost: RouteMiddleware<typeof routes.postPlugin> = ({
  models
}) => {
  return async ctx => {
    await models.plugin.insert(ctx.req.valid('json'));
    return ctx.body(null, 201);
  };
};
