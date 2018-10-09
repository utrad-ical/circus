import performSearch from '../../performSearch';

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.plugin, {}, ctx, {});
  };
};
