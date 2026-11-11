import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import { endSession } from '../../middleware/auth/session.ts';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    if (!ctx.user) {
      ctx.throw(status.UNAUTHORIZED);
    }
    const userEmail = ctx.user.userEmail;
    await models.token.deleteMany({
      userId: userEmail,
      permanentTokenId: null // non-permanent tokens
    });
    await endSession(ctx, models);
    ctx.body = null; // No content
  };
};
