import { FunctionService } from '@utrad-ical/circus-lib';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import koa from 'koa';
import { Models } from './interface';
import generateUniqueId from '../src/utils/generateUniqueId';
import { Writable, PassThrough } from 'stream';
import fs from 'fs';

interface TaskManager {
  register: (
    ctx: koa.Context,
    options: {
      name: string;
      userEmail: string;
      downloadable?: string; // mime type if downloadable
    }
  ) => Promise<{
    taskId: string;
    emitter: EventEmitter;
    downloadFile?: Writable;
  }>;
  report: (ctx: koa.Context, taskId: string) => Promise<void>;
  isTaskInProgress: (taskId: string) => boolean;
}

interface Events {
  // Notifies the progress.
  progress: (message: string, finished?: number, total?: number) => void;
  // Notifies that an error happened.
  error: (message: string) => void;
  // Notifies that tha task has finished successfully.
  finish: (message: string) => void;
}

interface Task {
  finished?: number;
  total?: number;
  message: string;
  emitter: StrictEventEmitter<EventEmitter, Events>;
}

interface Options {
  downloadFileDirectory: string;
  timeoutMs: number;
}

const createTaskManager: FunctionService<
  TaskManager,
  { models: Models },
  Options
> = async (opt, deps) => {
  // In-memory storage of ongoing tasks
  const tasks = new Map<string, Task>();

  const register = async (
    ctx: koa.Context,
    options: {
      name: string;
      userEmail: string;
      downloadFileType?: string; // set to undefined if the file is not downloadable
    }
  ) => {
    const taskId = generateUniqueId();
    await deps.models.task.insert({
      taskId,
      name: options.name,
      userEmail: options.userEmail,
      status: 'processing',
      downloadFileType: null
    });
    const emitter = new EventEmitter() as StrictEventEmitter<
      EventEmitter,
      Events
    >;

    ctx.body = { taskId };

    // Prepare write fs stream for downloadable files (if exists)
    const stream =
      typeof options.downloadFileType === 'string'
        ? fs.createWriteStream(`${opt.downloadFileDirectory}/${taskId}`)
        : undefined;

    stream?.on('error', error => ctx.throw(error));

    const task: Task = {
      message: '',
      emitter
    };

    const handleProgress = (
      message: string,
      finished?: number,
      total?: number
    ) => {
      task.message = message;
      task.finished = finished;
      task.total = total;
    };

    const handleError = async () => {
      await deps.models.task.modifyOne(taskId, { $set: { status: 'error' } });
      tasks.delete(taskId);
      removeHandlers();
    };

    const handleFinish = async () => {
      await deps.models.task.modifyOne(taskId, { $set: { status: 'finish' } });
      tasks.delete(taskId);
      removeHandlers();
    };

    const removeHandlers = () => {
      emitter.off('progress', handleProgress);
      emitter.off('error', handleError);
      emitter.off('finish', handleFinish);
    };

    tasks.set(taskId, task);
    emitter.on('progress', handleProgress);
    emitter.on('error', handleError);
    emitter.on('finish', handleFinish);

    return { taskId, emitter, stream };
  };

  const report = async (ctx: koa.Context, taskId: string) => {
    const task = tasks.get(taskId);
    const taskInDb = await deps.models.task.findById(taskId);

    switch (taskInDb.status) {
      case 'error':
        ctx.throw(404, 'error task');
      case 'finish':
        ctx.throw(404, 'finished task');
    }

    if (!task) ctx.throw(404, 'Non-existent task ID');

    ctx.type = 'text/event-stream';
    const stream = new PassThrough();
    ctx.body = stream;

    const taskToString = () =>
      JSON.stringify({
        message: task.message,
        finished: task.finished,
        total: task.total
      });

    stream.write('event: progress\n');
    stream.write(`data: ${taskToString()}\n\n`);

    const handleProgress = () => {
      stream.write('event: progress\n');
      stream.write(`data: ${taskToString()}\n\n`);
    };

    const handleError = async (message: string) => {
      stream.write('event: error\n');
      stream.write(`data: ${JSON.stringify({ message })}\n\n`);
    };

    const handleFinish = async (message: string) => {
      stream.write('event: finish\n');
      stream.write(`data: ${JSON.stringify({ message })}\n\n`);
    };

    stream.on('close', () => {
      task.emitter.off('progress', handleProgress);
      task.emitter.off('error', handleError);
      task.emitter.off('finish', handleFinish);
    });

    task.emitter.on('progress', handleProgress);
    task.emitter.on('error', handleError);
    task.emitter.on('finish', handleFinish);
  };

  const isTaskInProgress = (taskId: string) => {
    return tasks.has(taskId);
  };

  return { register, report, isTaskInProgress };
};

createTaskManager.dependencies = ['models'];

export default createTaskManager;
