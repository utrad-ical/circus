import httpStatus from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handlePost: RouteMiddleware<typeof routes.postProgress> = ({
  progressManager
}) => {
  return async ctx => {
    const progressId = progressManager.issue(ctx.user.userEmail);
    ctx.status = httpStatus.CREATED;
    ctx.body = { progressId };
  };
};

export const handleGet: RouteMiddleware<typeof routes.getProgress> = ({
  progressManager
}) => {
  return async ctx => {
    progressManager.respond(ctx, ctx.params.progressId, ctx.user.userEmail);
  };
};
