import { FunctionService, Logger } from '@utrad-ical/circus-lib';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import { Models } from './interface';
import generateUniqueId from '../src/utils/generateUniqueId';
import { Writable, PassThrough } from 'stream';
import fs from 'fs';
import _ from 'lodash';
import { CircusContext } from './typings/middlewares';

export type TaskEventEmitter = StrictEventEmitter<EventEmitter, TaskEvents>;

export interface TaskManager {
  register: (
    ctx: CircusContext,
    options: {
      name: string;
      userEmail: string;
      downloadFileType?: string; // mime type if downloadable
    }
  ) => Promise<{
    taskId: string;
    emitter: TaskEventEmitter;
    downloadFileStream?: Writable;
  }>;
  report: (ctx: CircusContext, userEmail: string) => void;
  isTaskInProgress: (taskId: string) => boolean;
  download: (ctx: CircusContext, taskId: string) => Promise<void>;
}

interface TaskEvents {
  // Notifies the progress.
  progress: (message: string, finished?: number, total?: number) => void;
  // Notifies that an error happened.
  error: (message: string) => void;
  // Notifies that tha task has finished successfully.
  finish: () => void;
}

interface AggregatedEvents {
  taskEvent: (
    taskId: string,
    type: 'progress' | 'finish' | 'error',
    task: Task
  ) => void;
}

interface Task {
  userEmail: string;
  finished?: number;
  total?: number;
  message: string;
}

interface Options {
  downloadFileDirectory: string;
  timeoutMs: number;
}

const createTaskManager: FunctionService<
  TaskManager,
  { models: Models; apiLogger: Logger },
  Options
> = async (opt, deps) => {
  const { models, apiLogger } = deps;

  // In-memory storage of ongoing tasks
  const tasks = new Map<string, Task>();
  const aggregatedEmitter = new EventEmitter() as StrictEventEmitter<
    EventEmitter,
    AggregatedEvents
  >;

  const downloadFileName = (taskId: string) => {
    return `${opt.downloadFileDirectory}/${taskId}`;
  };

  const register = async (
    ctx: CircusContext,
    options: {
      name: string;
      userEmail: string;
      downloadFileType?: string; // set to undefined if the file is not downloadable
    }
  ) => {
    const taskId = generateUniqueId();
    await models.task.insert({
      taskId,
      name: options.name,
      userEmail: options.userEmail,
      status: 'processing',
      errorMessage: '',
      downloadFileType: options.downloadFileType ?? null,
      dismissed: false
    });
    const emitter = new EventEmitter() as TaskEventEmitter;

    ctx.body = { taskId };

    // Prepare write fs stream for downloadable files (if exists)
    const downloadFileStream =
      typeof options.downloadFileType === 'string'
        ? fs.createWriteStream(downloadFileName(taskId))
        : undefined;

    const task: Task = {
      userEmail: options.userEmail,
      message: ''
    };

    const handleProgress = (
      message: string,
      finished?: number,
      total?: number
    ) => {
      task.message = message;
      task.finished = finished;
      task.total = total;
      aggregatedEmitter.emit('taskEvent', taskId, 'progress', task);
    };

    const throttleHandleProgress = _.throttle(handleProgress, 150);

    const handleError = async (message: string) => {
      removeHandlers();
      aggregatedEmitter.emit('taskEvent', taskId, 'error', task);
      tasks.delete(taskId);
      await models.task.modifyOne(taskId, {
        status: 'error',
        errorMessage: message
      });
    };

    const handleStreamError = (err: Error) => {
      apiLogger.error(`Filesystem write stream error (taskId: ${taskId})`);
      apiLogger.error(err.message);
      handleError(
        'Internal file system error happened while creating the download file.'
      );
    };

    const handleFinish = async () => {
      removeHandlers();
      aggregatedEmitter.emit('taskEvent', taskId, 'finish', task);
      tasks.delete(taskId);
      await models.task.modifyOne(taskId, { status: 'finished' });
    };

    const removeHandlers = () => {
      emitter.off('progress', throttleHandleProgress);
      emitter.off('error', handleError);
      emitter.off('finish', handleFinish);
      downloadFileStream?.off?.('error', handleStreamError);
    };

    tasks.set(taskId, task);
    emitter.on('progress', throttleHandleProgress);
    emitter.on('error', handleError);
    emitter.on('finish', handleFinish);
    downloadFileStream?.on?.('error', handleStreamError);

    return { taskId, emitter, downloadFileStream };
  };

  const report = (ctx: CircusContext, userEmail: string) => {
    ctx.type = 'text/event-stream';
    const stream = new PassThrough();
    ctx.body = stream;
    stream.write('\n'); // send first byte to ensure the stream is live

    const timerId = setInterval(() => {
      stream.write(':\n'); // keeps the connection alive
    }, 10000);

    const taskToString = (taskId: string, task: Task) =>
      JSON.stringify({
        taskId,
        message: task.message,
        finished: task.finished,
        total: task.total
      });

    for (const [taskId, task] of tasks.entries()) {
      if (task.userEmail === userEmail) {
        stream.write('event: progress\n');
        stream.write(`data: ${taskToString(taskId, task)}\n\n`);
      }
    }

    const handleTaskEvent = (
      taskId: string,
      type: 'progress' | 'finish' | 'error',
      task: Task
    ) => {
      if (userEmail !== task.userEmail) return;
      switch (type) {
        case 'progress':
          if (!tasks.has(taskId)) return;
          stream.write('event: progress\n');
          stream.write(`data: ${taskToString(taskId, task)}\n\n`);
          break;
        case 'finish':
          stream.write('event: finish\n');
          stream.write(`data: ${taskToString(taskId, task)}\n\n`);
          break;
        case 'error':
          stream.write('event: error\n');
          stream.write(`data: ${taskToString(taskId, task)}\n\n`);
          break;
      }
    };

    stream.on('close', () => {
      clearInterval(timerId);
      aggregatedEmitter.off('taskEvent', handleTaskEvent);
    });

    aggregatedEmitter.on('taskEvent', handleTaskEvent);
  };

  const isTaskInProgress = (taskId: string) => {
    return tasks.has(taskId);
  };

  const download = async (ctx: CircusContext, taskId: string) => {
    const task = await models.task.findByIdOrFail(taskId);
    const fileName = downloadFileName(taskId);
    const stream = fs.createReadStream(fileName);
    ctx.type = task.downloadFileType;
    ctx.body = stream;
  };

  return { register, report, isTaskInProgress, download };
};

createTaskManager.dependencies = ['models', 'apiLogger'];

export default createTaskManager;
