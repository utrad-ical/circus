import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import { checkCsrfHeader, endSession } from '../../middleware/auth/session.ts';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    if (!ctx.user) {
      ctx.throw(status.UNAUTHORIZED);
    }
    // This GET request changes data; `SameSite=Lax` sends the cookie with
    // cross-site top-level navigation, so require the header for the cookie.
    // (The web UI uses `DELETE /api/session`; this is for API clients.)
    if (ctx.state.authenticatedBySessionCookie) checkCsrfHeader(ctx, true);
    const userEmail = ctx.user.userEmail;
    await models.token.deleteMany({
      userId: userEmail,
      permanentTokenId: null // non-permanent tokens
    });
    await endSession(ctx, models);
    ctx.body = null; // No content
  };
};
