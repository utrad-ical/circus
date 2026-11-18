import { httpError } from '../../../middleware/errorHandler.ts';
import status from 'http-status';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';

export const handleGet: RouteMiddleware<typeof routes.getPluginJobManager> = ({
  cs
}) => {
  return async (ctx, json) => {
    const status = await cs.daemon.status();
    return json({ status });
  };
};

export const handlePut: RouteMiddleware<
  typeof routes.switchPluginJobManager
> = ({ cs }) => {
  return async (ctx, json) => {
    const currentStatus = await cs.daemon.status();
    const newStatus = ctx.req.valid('json').status;
    if (currentStatus !== newStatus) {
      if (newStatus === 'running') {
        await cs.daemon.start();
      } else if (newStatus === 'stopped') {
        await cs.daemon.stop();
      } else {
        throw httpError(status.BAD_REQUEST);
      }
    }
    return json({ status: newStatus });
  };
};
