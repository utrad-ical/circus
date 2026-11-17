import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleSearch: RouteMiddleware<typeof routes.getServerParams> = ({
  models
}) => {
  return async (ctx, next) => {
    const params = await models.serverParam.findAll();
    const results: { [key: string]: unknown } = {};
    params.forEach(p => (results[p.key] = p.value));
    ctx.body = results;
  };
};

export const handleGet: RouteMiddleware<typeof routes.getServerParam> = ({
  models
}) => {
  return async (ctx, next) => {
    const key = ctx.params.key;
    const param = await models.serverParam.findByIdOrFail(key);
    ctx.body = param.value;
  };
};

export const handlePutOne: RouteMiddleware<typeof routes.putServerParam> = ({
  models
}) => {
  return async (ctx, next) => {
    const key = ctx.params.key;
    const value = ctx.request.body;
    await models.serverParam.upsert(key, { value });
    ctx.body = null; // No Content
  };
};

export const handlePutAll: RouteMiddleware<typeof routes.putServerParams> = ({
  models
}) => {
  return async (ctx, next) => {
    const values = ctx.request.body;
    for (const key in values) {
      await models.serverParam.upsert(key, { value: values[key] });
    }
    ctx.body = null; // No Content
  };
};
