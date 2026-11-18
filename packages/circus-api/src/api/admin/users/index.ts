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
  return async (ctx, next) => {
    await performSearch(models.user, {}, ctx, {
      transform: removePassword,
      defaultSort: { createdAt: -1 }
    });
  };
};

export const handleGet: RouteMiddleware<typeof routes.getUser> = ({
  models
}) => {
  return async (ctx, next) => {
    const user = await models.user.findByIdOrFail(ctx.params.userEmail);
    ctx.body = removePassword(user);
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchUser> = ({
  models
}) => {
  return async (ctx, next) => {
    const { password, ...updating } = ctx.request.body;
    await models.user.modifyOne(ctx.params.userEmail, {
      ...updating,
      ...(password ? { password: nodepass.hash(password) } : {})
    });
    ctx.body = null;
  };
};

export const handlePost: RouteMiddleware<typeof routes.postUser> = ({
  models
}) => {
  return async (ctx, next) => {
    const { password, preferences, ...rest } = ctx.request.body;
    await models.user.insert({
      ...rest,
      preferences: { ...defaultPreferences(), ...preferences },
      password: nodepass.hash(password),
      lastLoginTime: new Date(0),
      lastLoginIp: ''
    });
    ctx.body = { userEmail: rest.userEmail };
    ctx.status = status.CREATED;
  };
};
