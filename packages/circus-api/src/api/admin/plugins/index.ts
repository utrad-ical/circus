import performSearch from '../../performSearch';
import { RouteMiddleware } from '../../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.plugin, {}, ctx, {});
  };
};

export const handlePut: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    await models.plugin.modifyOne(pluginId, ctx.request.body);
    ctx.body = null;
  };
};
