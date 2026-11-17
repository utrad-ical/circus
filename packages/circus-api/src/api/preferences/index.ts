import { defaultPreferences } from '../../utils/preferenceUtils.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getPreferences> = () => {
  return async (ctx, next) => {
    ctx.body = {
      ...defaultPreferences(),
      ...ctx.user.preferences
    };
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchPreferences> = ({
  models
}) => {
  return async (ctx, next) => {
    const updates = ctx.request.body;
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: { ...ctx.user.preferences, ...updates }
    });
    ctx.body = null;
  };
};
