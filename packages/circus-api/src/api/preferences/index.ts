import { defaultPreferences } from '../../utils/preferenceUtils';
import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = {
      ...defaultPreferences(),
      ...ctx.user.preferences
    };
  };
};

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const updates = ctx.request.body;
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: { ...ctx.user.preferences, ...updates }
    });
    ctx.body = null;
  };
};
