import { stream } from 'hono/streaming';
import delay from '../../utils/delay.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

import packageJson from '../../../package.json' with { type: 'json' };

const version = packageJson.version;
const upSince = new Date().toISOString();

export const handleGet: RouteMiddleware<typeof routes.getStatus> = () => {
  return async (_ctx, json) => {
    return json({
      status: 'running',
      version,
      upSince,
      process: {
        version: process.version,
        upTime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  };
};

export const handleEcho: RouteMiddleware<typeof routes.postEcho> = () => {
  return async (ctx, json) => json(ctx.var.jsonBody ?? {});
};

export const handleDummyProgress: RouteMiddleware<
  typeof routes.getDummyProgress
> = () => {
  return async ctx => {
    ctx.header('Content-Type', 'text/event-stream');
    return stream(ctx, async output => {
      for (let i = 0; i <= 50 && !output.aborted; i++) {
        await delay(100);
        const data = {
          progress: i * 2,
          message: `${i * 2}% done.`
        };
        await output.write(
          'event: progress\n' + 'data: ' + JSON.stringify(data) + '\n\n'
        );
      }
      if (!output.aborted) await output.write('event: complete\n\n');
    });
  };
};
