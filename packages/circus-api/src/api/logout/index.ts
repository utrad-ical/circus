import status from 'http-status';
import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    if (!ctx.user) {
      ctx.throw(status.UNAUTHORIZED);
    }
    const userEmail = ctx.user.userEmail;
    await models.token.deleteMany({ userId: userEmail });
    ctx.body = null; // No content
  };
};
