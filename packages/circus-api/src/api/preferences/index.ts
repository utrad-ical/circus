import { defaultPreferences } from '../../utils/preferenceUtils.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getPreferences> = () => {
  return async (ctx, json) => {
    return json({
      ...defaultPreferences(),
      ...ctx.var.user.preferences
    });
  };
};

export const handlePatch: RouteMiddleware<typeof routes.patchPreferences> = ({
  models
}) => {
  return async ctx => {
    const updates = ctx.req.valid('json');
    await models.user.modifyOne(ctx.var.user.userEmail, {
      preferences: { ...ctx.var.user.preferences, ...updates }
    });
    return ctx.body(null, 204);
  };
};
