import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    if (
      !ctx.userPrivileges.accessiblePlugins.find(
        p => p.roles.includes('readPlugin') && p.pluginId == pluginId
      )
    ) {
      ctx.throw(401, `You do not have permission to get this plugin.`);
    }
    const plugin = await models.plugin.findByIdOrFail(pluginId);
    ctx.body = plugin;
  };
};

export const handleList: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const plugins = ctx.userPrivileges.accessiblePlugins
      .filter(p => p.roles.includes('readPlugin'))
      .map(p => p.plugin);
    ctx.body = plugins;
  };
};
