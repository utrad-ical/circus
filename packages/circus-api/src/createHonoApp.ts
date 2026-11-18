import { parse } from 'node:querystring';
import type { Logger } from '@utrad-ical/circus-lib';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { formatError } from './middleware/errorHandler.ts';
import { readJsonBody } from './middleware/validateInOut.ts';
import type { ApiEnv } from './typings/middlewares.ts';

export const createHonoApp = ({
  logger,
  debug = false,
  corsOrigin
}: {
  logger: Logger;
  debug?: boolean;
  corsOrigin?: string;
}) => {
  const app = new Hono<ApiEnv>({ strict: false });
  app.use('*', async (ctx, next) => {
    logger.trace('Request', ctx.req.method, ctx.req.path);
    const { search } = new URL(ctx.req.url);
    ctx.set('query', parse(search.slice(1)));
    await next();
    // Hono drops the GET body for HEAD without consuming the stream.
    if (ctx.req.method === 'HEAD') {
      void ctx.res.body?.cancel().catch(error => logger.error(error));
    }
  });
  if (corsOrigin) {
    app.use(
      '/api/*',
      cors({
        origin: corsOrigin,
        allowMethods: ['POST', 'GET', 'PUT', 'OPTIONS', 'PATCH', 'DELETE'],
        allowHeaders: ['Authorization', 'Content-Type'],
        credentials: true,
        maxAge: 86400
      })
    );
  }
  app.use('/api/*', readJsonBody);
  app.onError((error, ctx) => {
    const { status, body, headers } = formatError(error, {
      includeErrorDetails: debug,
      logger
    });
    headers?.forEach((value, name) => ctx.header(name, value));
    return ctx.json(body, status);
  });
  app.notFound(ctx => ctx.json({ error: 'Not found' }, 404));
  return app;
};
