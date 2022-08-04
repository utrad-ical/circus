import { FunctionService, Logger } from '@utrad-ical/circus-lib';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import status from 'http-status';
import _ from 'lodash';
import mime from 'mime';
import { PassThrough, Writable } from 'stream';
import path from 'path';
import StrictEventEmitter from 'strict-event-emitter-types';
import generateUniqueId from '../src/utils/generateUniqueId';
import { Models } from './interface';
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
  deleteDownload: (taskId: string) => Promise<void>;
}

interface TaskEvents {
  // Notifies the progress.
  progress: (message: string, finished?: number, total?: number) => void;
  // Notifies that an error happened.
  error: (message: string) => void;
  // Notifies that tha task has finished successfully.
  finish: (message?: string) => void;
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
  timeoutMs?: number;
  deleteDownloadFilesAfterMs?: number;
  checkDownloadFilesIntervalMs?: number;
}

/**
 * Delete files older than the specified milliseconds, in the speficied directory
 * @param directory - Directory to delete files from
 * @param milliseconds - The max file age in milliseconds
 * @param logger - The Logger instance to use
 */
export const deleteOldFiles = async (
  directory: string,
  milliseconds: number,
  logger: Logger
) => {
  logger.info(`Started deleting old download files in ${directory}`);
  const files = await fs.readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fs.stat(filePath);
    if (stats.isFile() && stats.mtimeMs < Date.now() - milliseconds) {
      logger.info(`Deleting old download file: ${filePath}`);
      await fs.unlink(filePath);
    }
  }
};

const createTaskManager: FunctionService<
  TaskManager,
  { models: Models; apiLogger: Logger },
  Options
> = async (opt, deps) => {
  const { models, apiLogger } = deps;
  const {
    downloadFileDirectory,
    timeoutMs,
    deleteDownloadFilesAfterMs = 1000 * 60 * 60 * 24 * 7, // 1 week
    checkDownloadFilesIntervalMs = 1000 * 60 * 60 * 24 // 1 day
  } = opt;

  if (!downloadFileDirectory) {
    throw new Error('downloadFileDirectory is required');
  }

  // In-memory storage of ongoing tasks
  const tasks = new Map<string, Task>();
  const aggregatedEmitter = new EventEmitter() as StrictEventEmitter<
    EventEmitter,
    AggregatedEvents
  >;

  // Sets up timer to delete old files
  const deleteTimerId = setInterval(() => {
    deleteOldFiles(
      downloadFileDirectory,
      deleteDownloadFilesAfterMs,
      apiLogger
    ).catch(err =>
      apiLogger.error('Error while deleting old download files', err)
    );
  }, checkDownloadFilesIntervalMs);
  deleteTimerId.unref();

  const downloadFileName = (taskId: string) => {
    return path.join(downloadFileDirectory, taskId);
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
      errorMessage: null,
      finishedMessage: null,
      endedAt: null,
      downloadFileType: options.downloadFileType ?? null,
      dismissed: false
    });
    const emitter = new EventEmitter() as TaskEventEmitter;

    ctx.body = { taskId };
    ctx.status = status.CREATED;

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

    const throttledHandleProgress = _.throttle(handleProgress, 150);

    const handleError = async (message: string) => {
      removeHandlers();
      task.message = message;
      task.finished = undefined;
      task.total = undefined;
      aggregatedEmitter.emit('taskEvent', taskId, 'error', task);
      tasks.delete(taskId);
      await models.task.modifyOne(taskId, {
        status: 'error',
        endedAt: new Date(),
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

    const handleFinish = async (message?: string) => {
      removeHandlers();
      task.message = message ?? 'Finished.';
      task.finished = undefined;
      task.total = undefined;
      aggregatedEmitter.emit('taskEvent', taskId, 'finish', task);
      tasks.delete(taskId);
      await models.task.modifyOne(taskId, {
        status: 'finished',
        endedAt: new Date(),
        finishedMessage: task.message
      });
    };

    const removeHandlers = () => {
      emitter.off('progress', throttledHandleProgress);
      emitter.off('error', handleError);
      emitter.off('finish', handleFinish);
      downloadFileStream?.off?.('error', handleStreamError);
    };

    tasks.set(taskId, task);
    emitter.on('progress', throttledHandleProgress);
    emitter.on('error', handleError);
    emitter.on('finish', handleFinish);

    // At least one progress event must be emitted
    throttledHandleProgress('Starting the task.');

    downloadFileStream?.on('error', handleStreamError);

    return { taskId, emitter, downloadFileStream };
  };

  const report = (ctx: CircusContext, userEmail: string) => {
    ctx.type = 'text/event-stream';
    ctx.set('X-Accel-Buffering', 'no'); // Disables nginx buffering
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
    let stat: fs.Stats;
    try {
      stat = await fs.stat(fileName);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        ctx.throw(
          status.NOT_FOUND,
          'The requested download file for the ' +
            `task ${taskId} is no longer available.`
        );
      } else {
        throw err;
      }
    }
    const stream = fs.createReadStream(fileName);
    const ext =
      task.downloadFileType === 'application/x-tgz'
        ? 'tar.gz'
        : mime.getExtension(task.downloadFileType);
    ctx.set('Content-Deposition', `attachment; filename="download.${ext}"`);
    ctx.set('Content-Length', String(stat.size));
    ctx.type =
      task.downloadFileType === 'application/x-tgz'
        ? 'application/gzip'
        : task.downloadFileType;
    ctx.body = stream;
  };

  const deleteDownload = async (taskId: string) => {
    const fileName = downloadFileName(taskId);
    await fs.unlink(fileName);
  };

  return { register, report, isTaskInProgress, download, deleteDownload };
};

createTaskManager.dependencies = ['models', 'apiLogger'];

export default createTaskManager;
