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
      if (Array.isArray(urlQuery.filter)) throw new Error();
      customFilter = urlQuery.filter
        ? (EJSON.parse(urlQuery.filter) as object)
        : {};
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

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.user.userEmail;
    const taskId = ctx.params.taskId;
    const task = await models.task.findByIdOrFail(taskId);
    if (userEmail !== task.userEmail) {
      ctx.throw(httpStatus.UNAUTHORIZED, 'You cannot access this task.');
    }
    ctx.body = task;
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
      ctx.throw(httpStatus.CONFLICT, 'This task has not been completed.');
    await taskManager.download(ctx, taskId);
  };
};

export const handlePatch: RouteMiddleware = ({ models, taskManager }) => {
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

    if (task.status !== 'finished') {
      ctx.throw(httpStatus.BAD_REQUEST, 'The task is not completed yet.');
    }

    await models.task.modifyOne(taskId, { dismissed: body.dismissed });
    try {
      // Remove the download file
      if (task.downloadFileType && body?.dismissed) {
        await taskManager.deleteDownload(taskId);
      }
    } catch (err: any) {
      // An error may happen when the download file is still being accessed,
      // but we'll ignore it here.
    }
    ctx.body = null;
  };
};

export const handlePostDebugTask: RouteMiddleware = ({ taskManager }) => {
  return async (ctx, next) => {
    const {
      steps: _steps = '10',
      tick: _tick = '1000',
      dl,
      fails
    } = ctx.request.body;
    const steps = Number(_steps);
    const tick = Number(_tick);
    const { emitter, downloadFileStream } = await taskManager.register(ctx, {
      name: 'Debug Task',
      userEmail: ctx.user.userEmail,
      downloadFileType: dl ? 'application/octet-stream' : undefined
    });

    const delay = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms));

    (async () => {
      downloadFileStream?.end('Hello.');
      for (let i = 0; i < steps; i++) {
        await delay(tick);
        emitter.emit('progress', 'Magic happening', i, steps);
      }
      emitter.emit(fails ? 'error' : 'finish', 'This is a result message.');
    })();
  };
};
