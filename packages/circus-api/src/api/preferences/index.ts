import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = ctx.user.preferences;
  };
};

export const handlePut: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: ctx.request.body
    });
    ctx.body = null;
  };
};

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: { ...ctx.user.preferences, ...ctx.request.body }
    });
    ctx.body = null;
  };
};
