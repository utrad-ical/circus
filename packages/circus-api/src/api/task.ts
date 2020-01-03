import * as randomstring from 'randomstring';
import { PassThrough } from 'stream';
import status from 'http-status';
import delay from '../utils/delay';
import { Models } from '../db/createModels';
import koa from 'koa';

export default class TaskReporter {
  private taskId: string;
  private owner: string;
  private models: Models;

  constructor(taskId: string, owner: string, { models }: { models: Models }) {
    this.taskId = taskId;
    this.owner = owner;
    this.models = models;
  }

  async report(ctx: koa.Context) {
    const task = await this.models.task.findByIdOrFail(this.taskId);
    if (task.owner !== this.owner) {
      ctx.throw(status.UNAUTHORIZED);
    }

    const stream = new PassThrough();
    ctx.body = stream;
    ctx.type = 'text/event-stream';

    Promise.resolve().then(async () => {
      while (true) {
        const task = await this.models.task.findByIdOrFail(this.taskId);
        const data = {
          value: task.value,
          max: task.max,
          textStatus: task.textStatus
        };
        stream.write(
          'event: progress\n' + 'data: ' + JSON.stringify(data) + '\n\n'
        );
        if (task.status === 'finished' || task.status === 'error') {
          stream.end();
          break;
        }
        await delay(1000);
      }
    });
  }
}

export class TaskExecutor {
  private models: Models;
  private owner: string;
  private command: string;
  private taskId?: string;

  constructor(
    owner: string,
    { models, command }: { models: Models; command: string }
  ) {
    this.models = models;
    this.owner = owner;
    this.command = command;
  }

  async saveNew() {
    const taskId = randomstring.generate({ length: 32, charset: 'hex' });
    await this.models.task.insert({
      taskId,
      owner: this.owner,
      status: 'running',
      command: '',
      download: '',
      publicDownload: false,
      textStatus: 'Preparing...',
      logs: [],
      value: 0,
      max: 100
    });
    this.taskId = taskId;
    return taskId;
  }

  async progress(textStatus: string, value: number, max: number) {
    if (!this.taskId) throw new Error('Task not saved yet');
    await this.models.task.modifyOne(this.taskId, { textStatus, value, max });
  }

  async settle(success: boolean) {
    if (!this.taskId) throw new Error('Task not saved yet');
    const status = success ? 'finished' : 'error';
    await this.models.task.modifyOne(this.taskId, { status });
  }

  async finish() {
    await this.settle(true);
  }

  async error() {
    await this.settle(false);
  }
}
