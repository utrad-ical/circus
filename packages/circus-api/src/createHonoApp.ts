import { parse } from 'node:querystring';
import type { Logger } from '@utrad-ical/circus-lib';
import { Hono } from 'hono';
import { corsHeaders } from './middleware/cors.ts';
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
  const cors = corsHeaders(corsOrigin);
  app.use('*', async (ctx, next) => {
    for (const [name, value] of Object.entries(cors)) ctx.header(name, value);
    logger.trace('Request', ctx.req.method, ctx.req.path);
    if (
      ctx.req.method === 'OPTIONS' &&
      (ctx.req.path === '/api' || ctx.req.path.startsWith('/api/'))
    ) {
      return ctx.body(null, 200);
    }
    const { search } = new URL(ctx.req.url);
    ctx.set('query', parse(search.slice(1)));
    await next();
    // Hono drops the GET body for HEAD without consuming the stream.
    if (ctx.req.method === 'HEAD') {
      void ctx.res.body?.cancel().catch(error => logger.error(error));
    }
  });
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
