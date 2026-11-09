import type { RouteMiddleware } from '../../typings/middlewares.ts';

export const handleGet: RouteMiddleware = ({}) => {
  return async (ctx, next) => {
    ctx.body = ctx.project;
  };
};
