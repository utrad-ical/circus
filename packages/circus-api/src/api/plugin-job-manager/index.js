import status from 'http-status';
import * as jobManager from '../mockJobManager';

export const handleGet = () => {
  return async (ctx, next) => {
    const status = await jobManager.status();
    ctx.body = { status };
  };
};

export const handlePatch = () => {
  return async (ctx, next) => {
    const currentStatus = jobManager.status();
    const newStatus = ctx.request.body.status;
    if (currentStatus !== newStatus) {
      if (newStatus === 'running') {
        await jobManager.start();
      } else if (newStatus === 'stopped') {
        await jobManager.stop();
      } else {
        ctx.throw(status.BAD_REQUEST);
      }
    }
    ctx.body = { status: newStatus };
  };
};
