import { FunctionService } from '@utrad-ical/circus-lib';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import koa from 'koa';
import { Models } from './interface';
import generateUniqueId from '../src/utils/generateUniqueId';
import { Writable, PassThrough } from 'stream';
import fs from 'fs';
import _ from 'lodash';

export interface TaskManager {
  register: (
    ctx: koa.Context,
    options: {
      name: string;
      userEmail: string;
      downloadFileType?: string; // mime type if downloadable
    }
  ) => Promise<{
    taskId: string;
    emitter: EventEmitter;
    downloadFileStream?: Writable;
  }>;
  report: (ctx: koa.Context, taskId: string) => void;
  isTaskInProgress: (taskId: string) => boolean;
}

interface TaskEvents {
  // Notifies the progress.
  progress: (message: string, finished?: number, total?: number) => void;
  // Notifies that an error happened.
  error: (message: string) => void;
  // Notifies that tha task has finished successfully.
  finish: (message: string) => void;
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
  { models: Models },
  Options
> = async (opt, deps) => {
  // In-memory storage of ongoing tasks
  const tasks = new Map<string, Task>();
  const aggregatedEmitter = new EventEmitter() as StrictEventEmitter<
    EventEmitter,
    AggregatedEvents
  >;

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
      downloadFileType: options.downloadFileType ?? null
    });
    const emitter = new EventEmitter() as StrictEventEmitter<
      EventEmitter,
      TaskEvents
    >;

    ctx.body = { taskId };

    // Prepare write fs stream for downloadable files (if exists)
    const downloadFileStream =
      typeof options.downloadFileType === 'string'
        ? fs.createWriteStream(`${opt.downloadFileDirectory}/${taskId}`)
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

    const handleError = async () => {
      removeHandlers();
      aggregatedEmitter.emit('taskEvent', taskId, 'error', task);
      tasks.delete(taskId);
      await deps.models.task.modifyOne(taskId, { status: 'error' });
    };

    const handleFinish = async () => {
      removeHandlers();
      aggregatedEmitter.emit('taskEvent', taskId, 'finish', task);
      tasks.delete(taskId);
      await deps.models.task.modifyOne(taskId, { status: 'finished' });
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

    return { taskId, emitter, downloadFileStream };
  };

  const report = (ctx: koa.Context, userEmail: string) => {
    ctx.type = 'text/event-stream';
    const stream = new PassThrough();
    ctx.body = stream;

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

    const throttledHandleTaskEvent = _.throttle(handleTaskEvent, 150);

    stream.on('close', () => {
      aggregatedEmitter.off('taskEvent', throttledHandleTaskEvent);
    });

    aggregatedEmitter.on('taskEvent', throttledHandleTaskEvent);
  };

  const isTaskInProgress = (taskId: string) => {
    return tasks.has(taskId);
  };

  return { register, report, isTaskInProgress };
};

createTaskManager.dependencies = ['models'];

export default createTaskManager;
