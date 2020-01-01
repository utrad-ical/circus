import * as randomstring from 'randomstring';
import { PassThrough } from 'stream';
import status from 'http-status';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class TaskReporter {
  constructor(taskId, owner, { models }) {
    this.taskId = taskId;
    this.models = models;
  }

  async report(ctx) {
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
  constructor(owner, { models, command }) {
    this.models = models;
    this.owner = owner;
    this.command = command;
  }

  async saveNew() {
    const taskId = randomstring.generate(32, { charset: 'hex' });
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

  async progress(textStatus, value, max) {
    if (!this.taskId) throw new Error('Task not saved yet');
    await this.models.task.modifyOne(this.taskId, { textStatus, value, max });
  }

  async settle(success) {
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
