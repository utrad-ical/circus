import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getProject> = ({}) => {
  return async (ctx, next) => {
    ctx.body = ctx.project;
  };
};
