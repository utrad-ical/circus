import performSearch from '../../performSearch';
import { RouteMiddleware } from '../../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.plugin, {}, ctx, {
      defaultSort: { createdAt: -1 }
    });
  };
};

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    await models.plugin.modifyOne(pluginId, ctx.request.body);
    ctx.body = null;
  };
};
