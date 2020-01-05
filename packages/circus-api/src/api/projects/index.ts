import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({}) => {
  return async (ctx, next) => {
    ctx.body = ctx.project;
  };
};
