import { PassThrough } from 'stream';
import delay from '../../utils/delay';
import { RouteMiddleware } from '../../typings/middlewares';

const version = require('../../../package.json').version;
const upSince = new Date().toISOString();

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = {
      status: 'running',
      version,
      upSince,
      process: {
        version: process.version,
        upTime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  };
};

export const handleEcho: RouteMiddleware = () => {
  return async (ctx, next) => {
    ctx.body = ctx.request.body;
  };
};

export const handleDummyProgress: RouteMiddleware = () => {
  return async (ctx, next) => {
    const stream = new PassThrough();
    ctx.body = stream;
    ctx.type = 'text/event-stream';

    Promise.resolve().then(async () => {
      for (let i = 0; i <= 50; i++) {
        await delay(100);
        const data = {
          progress: i * 2,
          message: `${i * 2}% done.`
        };
        stream.write(
          'event: progress\n' + 'data: ' + JSON.stringify(data) + '\n\n'
        );
      }
      stream.end('event: complete\n\n');
    });
  };
};
