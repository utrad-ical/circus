import { PassThrough } from 'stream';
import delay from '../../utils/delay.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

import packageJson from '../../../package.json' with { type: 'json' };

const version = packageJson.version;
const upSince = new Date().toISOString();

export const handleGet: RouteMiddleware<typeof routes.getStatus> = () => {
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

export const handleEcho: RouteMiddleware<typeof routes.postEcho> = () => {
  return async (ctx, next) => {
    ctx.body = ctx.request.body;
  };
};

export const handleDummyProgress: RouteMiddleware<
  typeof routes.getDummyProgress
> = () => {
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
