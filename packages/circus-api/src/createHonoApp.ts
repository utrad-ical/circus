import type { Logger } from '@utrad-ical/circus-lib';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { routePath } from 'hono/route';
import { formatError } from './middleware/errorHandler.ts';
import { readJsonBody } from './middleware/validateInOut.ts';
import type { ApiEnv } from './typings/middlewares.ts';
import { parseQuery } from './utils/parseQuery.ts';

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
    ctx.set('query', parseQuery(ctx.req.url));
    await next();
    // Hono drops the GET body for HEAD without consuming the stream.
    if (ctx.req.method === 'HEAD') {
      void ctx.res.body?.cancel().catch(error => logger.error(error));
    }
  });
  if (corsOrigin) {
    const allowOrigin = cors({
      origin: corsOrigin,
      allowMethods: ['POST', 'GET', 'PUT', 'OPTIONS', 'PATCH', 'DELETE'],
      allowHeaders: ['Authorization', 'Content-Type'],
      credentials: true,
      maxAge: 86400
    });
    app.use('/api/*', allowOrigin);
    app.use('/rs/*', allowOrigin);
  }
  app.use('/api/*', readJsonBody);
  app.onError((error, ctx) => {
    const { status, body, headers } = formatError(error, {
      includeErrorDetails: debug,
      logger,
      route: `${ctx.req.method} ${routePath(ctx)}`
    });
    headers?.forEach((value, name) => ctx.header(name, value));
    return ctx.json(body, status);
  });
  app.notFound(ctx => ctx.json({ error: 'Not found' }, 404));
  return app;
};
