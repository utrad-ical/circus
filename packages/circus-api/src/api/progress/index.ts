import httpStatus from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handlePost: RouteMiddleware<typeof routes.postProgress> = ({
  progressManager
}) => {
  return async (ctx, json) => {
    const progressId = progressManager.issue(ctx.var.user.userEmail);
    return json({ progressId }, httpStatus.CREATED);
  };
};

export const handleGet: RouteMiddleware<typeof routes.getProgress> =
  ({ progressManager }) =>
  async ctx =>
    ctx.body(
      progressManager.subscribe(
        ctx.req.param().progressId,
        ctx.var.user.userEmail
      ),
      200,
      {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no' // Disables nginx buffering
      }
    );
