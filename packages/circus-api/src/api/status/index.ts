import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getStatus> = () => {
  return async (ctx, next) => {
    ctx.body = { status: 'running' };
  };
};
