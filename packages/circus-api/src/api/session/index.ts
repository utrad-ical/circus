import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import {
  checkCsrfHeader,
  endSession,
  startSession
} from '../../middleware/auth/session.ts';

export const handlePost: RouteMiddleware<typeof routes.postSession> = ({
  models,
  verifyUser
}) => {
  return async (ctx, next) => {
    // Prevents other sites from logging the user in as someone else
    checkCsrfHeader(ctx);
    const body = ctx.request.body;
    // For a onetime password, pass the same value in both fields.
    const [username, password] =
      'onetime' in body
        ? [body.onetime, body.onetime]
        : [body.username, body.password];
    const user = await verifyUser(username, password);
    if (!user || !user.loginEnabled) {
      return ctx.throw(status.UNAUTHORIZED, 'Invalid credentials.');
    }
    // Replaces the session of another user, if any
    await endSession(ctx, models);
    await startSession(ctx, models, user.userEmail);
    ctx.body = null; // No content
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteSession> = ({
  models
}) => {
  return async (ctx, next) => {
    checkCsrfHeader(ctx);
    await endSession(ctx, models);
    ctx.body = null; // No content
  };
};
