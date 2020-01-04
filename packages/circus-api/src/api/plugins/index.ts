import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    const plugin = await models.plugin.findByIdOrFail(pluginId);
    ctx.body = plugin;
  };
};

export const handleList: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const plugins = await models.plugin.findAll();
    ctx.body = plugins;
  };
};
