import status from 'http-status';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getPluginJobManager> = ({
  cs
}) => {
  return async (ctx, next) => {
    const status = await cs.daemon.status();
    ctx.body = { status };
  };
};

export const handlePut: RouteMiddleware<
  typeof routes.switchPluginJobManager
> = ({ cs }) => {
  return async (ctx, next) => {
    const currentStatus = await cs.daemon.status();
    const newStatus = ctx.request.body.status;
    if (currentStatus !== newStatus) {
      if (newStatus === 'running') {
        await cs.daemon.start();
      } else if (newStatus === 'stopped') {
        await cs.daemon.stop();
      } else {
        ctx.throw(status.BAD_REQUEST);
      }
    }
    ctx.body = { status: newStatus };
  };
};
