import { httpError } from '../../middleware/errorHandler.ts';
import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import {
  checkCsrfHeader,
  csrfHeaderName,
  endSession
} from '../../middleware/auth/session.ts';

export const handleGet: RouteMiddleware<typeof routes.getLogout> = ({
  models
}) => {
  return async ctx => {
    if (!ctx.var.user) {
      throw httpError(status.UNAUTHORIZED);
    }
    // This GET request changes data; `SameSite=Lax` sends the cookie with
    // cross-site top-level navigation, so require the header for the cookie.
    // (The web UI uses `DELETE /api/session`; this is for API clients.)
    if (ctx.var.authenticatedBySessionCookie)
      checkCsrfHeader(ctx.req.method, ctx.req.header(csrfHeaderName), true);
    const userEmail = ctx.var.user.userEmail;
    await models.token.deleteMany({
      userId: userEmail,
      permanentTokenId: null // non-permanent tokens
    });
    await endSession(ctx, models);
    return ctx.body(null, 204); // No content
  };
};
