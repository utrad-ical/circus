import { httpError } from '../../middleware/errorHandler.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getPlugin> = ({
  models
}) => {
  return async (ctx, json) => {
    const pluginId = ctx.req.param().pluginId;
    if (
      !ctx.var.userPrivileges.accessiblePlugins.find(
        p => p.roles.includes('readPlugin') && p.pluginId === pluginId
      )
    ) {
      throw httpError(401, `You do not have permission to get this plugin.`);
    }
    const plugin = await models.plugin.findByIdOrFail(pluginId);
    return json(plugin);
  };
};

export const handleList: RouteMiddleware<typeof routes.getPlugins> = () => {
  return async (ctx, json) => {
    const plugins = ctx.var.userPrivileges.accessiblePlugins
      .filter(p => p.roles.includes('readPlugin'))
      .map(p => p.plugin);
    return json(plugins);
  };
};
