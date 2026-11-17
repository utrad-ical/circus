import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getUser> = ({
  models
}) => {
  return async (ctx, next) => {
    const userEmail = ctx.params.userEmail;
    const user = await models.user.findByIdOrFail(userEmail);
    ctx.body = {
      userEmail: user.userEmail,
      loginId: user.loginId,
      description: user.description,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  };
};
