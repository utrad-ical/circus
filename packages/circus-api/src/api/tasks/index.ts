import performSearch from '../performSearch';
import httpStatus from 'http-status';
import { RouteMiddleware } from '../../typings/middlewares';
import checkFilter from '../../utils/checkFilter';
import { EJSON } from 'bson';

export const handleSearch: RouteMiddleware = ({
  models,
  taskManager,
  logger
}) => {
  return async (ctx, next) => {
    // custom filter provided by users
    const urlQuery = ctx.request.query;
    let customFilter: object;
    try {
      customFilter = urlQuery.filter ? EJSON.parse(urlQuery.filter) : {};
    } catch (err) {
      ctx.throw(httpStatus.BAD_REQUEST, 'Filter string could not be parsed.');
    }
    const fields = ['taskId', 'status', 'dismissed'];
    if (!checkFilter(customFilter!, fields))
      ctx.throw(httpStatus.BAD_REQUEST, 'Bad filter.');
    const userEmail = ctx.user.userEmail;
    const filter = { $and: [customFilter!, { userEmail }] };

    const opts = {
      transform: (data: any) => {
        if (
          data.status === 'processing' &&
          !taskManager.isTaskInProgress(data.taskId)
        ) {
          // This is a "zombine" task
          models.task
            .modifyOne(data.taskId, {
              status: 'error'
            })
            .catch(err => logger.error(err)); // does not await!
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

export const handleDownload: RouteMiddleware = ({ models, taskManager }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const taskId = ctx.params.taskId;
    const task = await models.task.findByIdOrFail(taskId);
    if (userEmail !== task.userEmail) {
      ctx.throw(httpStatus.UNAUTHORIZED, 'You cannot access this task.');
    }
    if (!task.downloadFileType)
      ctx.throw(
        httpStatus.BAD_REQUEST,
        'This task is not associated with a downloadable file.'
      );
    if (task.status !== 'finished')
      ctx.throw(httpStatus.CONFLICT, 'This task has not finished.');
    taskManager.download(ctx, taskId);
  };
};

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const taskId = ctx.params.taskId;
    const task = await models.task.findByIdOrFail(taskId);
    if (userEmail !== task.userEmail) {
      ctx.throw(httpStatus.UNAUTHORIZED, 'You cannot access this task.');
    }
    const body = ctx.request.body;
    if (
      Object.keys(body).length !== 1 ||
      (body?.dismissed !== true && body?.dismissed !== false)
    )
      ctx.throw(httpStatus.BAD_REQUEST);

    await models.task.modifyOne(taskId, { dismissed: body.dismissed });
    ctx.body = null;
  };
};
