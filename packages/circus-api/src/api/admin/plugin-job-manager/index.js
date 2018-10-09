import status from 'http-status';

export const handleGet = ({ cs }) => {
  return async (ctx, next) => {
    const status = await cs.daemon.status();
    ctx.body = { status };
  };
};

export const handlePost = ({ cs }) => {
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
