import { RouteMiddleware } from '../../../typings/middlewares';

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const params = await models.serverParam.findAll();
    const results: any = {};
    params.forEach(p => (results[p.key] = p.value));
    ctx.body = results;
  };
};

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const key = ctx.params.key;
    const param = await models.serverParam.findByIdOrFail(key);
    ctx.body = param.value;
  };
};

export const handlePutOne: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const key = ctx.params.key;
    const value = ctx.request.body;
    await models.serverParam.upsert(key, { value });
    ctx.body = null; // No Content
  };
};

export const handlePutAll: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const values = ctx.request.body;
    for (const key in values) {
      await models.serverParam.upsert(key, { value: values[key] });
    }
    ctx.body = null; // No Content
  };
};
