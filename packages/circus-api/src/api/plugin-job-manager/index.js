import status from 'http-status';

export const handleGet = ({ cs: { jobManagerController } }) => {
  return async (ctx, next) => {
    const status = await jobManagerController.status();
    ctx.body = { status };
  };
};

export const handlePatch = ({ cs: { jobManagerController } }) => {
  return async (ctx, next) => {
    const currentStatus = jobManagerController.status();
    const newStatus = ctx.request.body.status;
    if (currentStatus !== newStatus) {
      if (newStatus === 'running') {
        await jobManagerController.start();
      } else if (newStatus === 'stopped') {
        await jobManagerController.stop();
      } else {
        ctx.throw(status.BAD_REQUEST);
      }
    }
    ctx.body = { status: newStatus };
  };
};
