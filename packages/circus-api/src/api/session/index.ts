import { httpError } from '../../middleware/errorHandler.ts';
import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import {
  checkCsrfHeader,
  csrfHeaderName,
  endSession,
  startSession
} from '../../middleware/auth/session.ts';

export const handlePost: RouteMiddleware<typeof routes.postSession> = ({
  models,
  verifyUser
}) => {
  return async ctx => {
    // Prevents other sites from logging the user in as someone else
    checkCsrfHeader(ctx.req.method, ctx.req.header(csrfHeaderName));
    const body = ctx.req.valid('json');
    // For a onetime password, pass the same value in both fields.
    const [username, password] =
      'onetime' in body
        ? [body.onetime, body.onetime]
        : [body.username, body.password];
    const user = await verifyUser(username, password);
    if (!user || !user.loginEnabled) {
      throw httpError(status.UNAUTHORIZED, 'Invalid credentials.');
    }
    // Replaces the session of another user, if any
    await startSession(ctx, models, user.userEmail);
    return ctx.body(null, 204); // No content
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteSession> = ({
  models
}) => {
  return async ctx => {
    checkCsrfHeader(ctx.req.method, ctx.req.header(csrfHeaderName));
    await endSession(ctx, models);
    return ctx.body(null, 204); // No content
  };
};
