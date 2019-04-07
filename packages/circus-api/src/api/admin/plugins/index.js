import performSearch from '../../performSearch';

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.plugin, {}, ctx, {});
  };
};

export const handlePut = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    await models.plugin.modifyOne(pluginId, ctx.request.body);
    ctx.body = null;
  };
};
