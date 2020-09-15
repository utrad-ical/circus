import performSearch from '../performSearch';
import status from 'http-status';
import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models, taskManager }) => {
  return async (ctx, next) => {
    const taskId = ctx.params.taskId;
    console.log(taskId);
    // const task = await models.task.findByIdOrFail(taskId);
    // if (task.userEmail !== ctx.user.userEmail) {
    //   ctx.throw(status.FORBIDDEN);
    // }
    // ctx.body = task;
  };
};

export const handleSearch: RouteMiddleware = ({ models, taskManager }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const filter = { userEmail };
    // custom filter provided by users
    const fields = ['taskId', 'status'];

    const opts = {
      transform: (data: any) => {
        if (
          data.status === 'processing' &&
          !taskManager.isTaskInProgress(data.taskId)
        ) {
          // This is a "zombine" task
          models.task.modifyOne(data.taskId, {
            status: 'error',
            message: 'Task interrupted for unknown reason.'
          }); // does not await!
          return { ...data, status: 'error' };
        }
        return data;
      },
      defaultSort: { createdAt: -1 }
    };
    await performSearch(models.task, filter, ctx, opts);
  };
};

export const handleReport: RouteMiddleware = ({ taskManager }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    taskManager.report(ctx, userEmail);
  };
};
