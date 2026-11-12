import status from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import {
  checkCsrfHeader,
  endSession,
  startSession
} from '../../middleware/auth/session.ts';

export const handlePost: RouteMiddleware = ({ models, verifyUser }) => {
  return async (ctx, next) => {
    // Prevents other sites from logging the user in as someone else
    checkCsrfHeader(ctx);
    const body = ctx.request.body;
    // A onetime password is verified like a password grant
    // whose user name and password are both the onetime string
    const [username, password] =
      'onetime' in body
        ? [body.onetime, body.onetime]
        : [body.username, body.password];
    const user = await verifyUser(username, password);
    if (!user || !user.loginEnabled) {
      ctx.throw(status.UNAUTHORIZED, 'Invalid credentials.');
    }
    // Replaces the session of another user, if any
    await endSession(ctx, models);
    await startSession(ctx, models, user.userEmail);
    ctx.body = null; // No content
  };
};

export const handleDelete: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    checkCsrfHeader(ctx);
    await endSession(ctx, models);
    ctx.body = null; // No content
  };
};
