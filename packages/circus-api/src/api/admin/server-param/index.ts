import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleSearch: RouteMiddleware<typeof routes.getServerParams> = ({
  models
}) => {
  return async (ctx, json) => {
    const params = await models.serverParam.findAll();
    const results: { [key: string]: unknown } = {};
    params.forEach(p => (results[p.key] = p.value));
    return json(results);
  };
};

export const handleGet: RouteMiddleware<typeof routes.getServerParam> = ({
  models
}) => {
  return async (ctx, json) => {
    const key = ctx.req.param().key;
    const param = await models.serverParam.findByIdOrFail(key);
    return json(param.value);
  };
};

export const handlePutOne: RouteMiddleware<typeof routes.putServerParam> = ({
  models
}) => {
  return async ctx => {
    const key = ctx.req.param().key;
    const value = ctx.req.valid('json');
    await models.serverParam.upsert(key, { value });
    return ctx.body(null, 204); // No Content
  };
};

export const handlePutAll: RouteMiddleware<typeof routes.putServerParams> = ({
  models
}) => {
  return async ctx => {
    const values = ctx.req.valid('json');
    for (const key in values) {
      await models.serverParam.upsert(key, { value: values[key] });
    }
    return ctx.body(null, 204); // No Content
  };
};
