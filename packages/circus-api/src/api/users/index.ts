import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getUser> = ({
  models
}) => {
  return async (ctx, json) => {
    const userEmail = ctx.req.param().userEmail;
    const user = await models.user.findByIdOrFail(userEmail);
    return json({
      userEmail: user.userEmail,
      loginId: user.loginId,
      description: user.description,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  };
};
