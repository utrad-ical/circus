import status from 'http-status';
import nodepass from 'node-php-password';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import { defaultPreferences } from '../../../utils/preferenceUtils.ts';
import performSearch from '../../performSearch.ts';
import type * as routes from './routes.ts';

const removePassword = <T extends { password: string }>(user: T) => {
  const { password, ...rest } = user;
  return rest;
};

export const handleSearch: RouteMiddleware<typeof routes.getUsers> = ({
  models
}) => {
  return async (ctx, json) => {
    return json(
      await performSearch(models.user, {}, ctx, {
        transform: removePassword,
        defaultSort: { createdAt: -1 }
      })
    );
  };
};

export const handleGet: RouteMiddleware<typeof routes.getUser> = ({
  models
}) => {
  return async (ctx, json) => {
    const user = await models.user.findByIdOrFail(ctx.req.param().userEmail);
    return json(removePassword(user));
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchUser> = ({
  models
}) => {
  return async ctx => {
    const { password, ...updating } = ctx.req.valid('json');
    await models.user.modifyOne(ctx.req.param().userEmail, {
      ...updating,
      ...(password ? { password: nodepass.hash(password) } : {})
    });
    return ctx.body(null, 204);
  };
};

export const handlePost: RouteMiddleware<typeof routes.postUser> = ({
  models
}) => {
  return async (ctx, json) => {
    const { password, preferences, ...rest } = ctx.req.valid('json');
    await models.user.insert({
      ...rest,
      preferences: { ...defaultPreferences(), ...preferences },
      password: nodepass.hash(password),
      lastLoginTime: new Date(0),
      lastLoginIp: ''
    });
    return json({ userEmail: rest.userEmail }, status.CREATED);
  };
};
