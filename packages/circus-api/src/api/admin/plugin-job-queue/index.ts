import { listQueuedJobs } from '../../plugin-job-queue/index.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getQueue> = deps => {
  return async (ctx, next) => {
    ctx.body = await listQueuedJobs(deps, ctx);
  };
};
