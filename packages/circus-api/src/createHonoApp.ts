import type { Logger } from '@utrad-ical/circus-lib';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { matchedRoutes } from 'hono/route';
import type { Context } from 'hono';
import { formatError } from './middleware/errorHandler.ts';
import { readJsonBody } from './middleware/validateInOut.ts';
import type { ApiEnv } from './typings/middlewares.ts';
import { parseQuery } from './utils/parseQuery.ts';

const getRoute = (ctx: Context) => {
  const route = matchedRoutes(ctx)[ctx.req.routeIndex];
  return route && route.method !== 'ALL' ? route.path : null;
};

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
  const rsLogger = logger.child({ component: 'rs' });
  // Generate our own ID so that externally supplied values never enter logs.
  app.use('*', requestId({ headerName: '' }));
  app.use('*', async (ctx, next) => {
    const { method, path } = ctx.req;
    const { requestId } = ctx.var;
    const isRsRequest = path === '/rs' || path.startsWith('/rs/');
    const baseLogger = isRsRequest ? rsLogger : logger;
    const requestLogger = baseLogger.child({ requestId });
    const startedAt = performance.now();
    ctx.set('requestLogger', requestLogger);
    ctx.set('query', parseQuery(ctx.req.url));
    await next();
    ctx.header('X-Request-Id', requestId);
    const status = ctx.res.status;
    const fields = {
      method,
      route: getRoute(ctx),
      status,
      durationMs: performance.now() - startedAt
    };
    if (status >= 500) requestLogger.error(fields, 'HTTP request completed');
    else if (isRsRequest) requestLogger.debug(fields, 'HTTP request completed');
    else requestLogger.info(fields, 'HTTP request completed');
    // Hono drops the GET body for HEAD without consuming the stream.
    if (method === 'HEAD') {
      void ctx.res.body
        ?.cancel()
        .catch(err =>
          requestLogger.error({ err }, 'Failed to cancel HEAD response')
        );
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
      logger: ctx.var.requestLogger ?? logger,
      method: ctx.req.method,
      route: getRoute(ctx)
    });
    headers?.forEach((value, name) => ctx.header(name, value));
    return ctx.json(body, status);
  });
  app.notFound(ctx => ctx.json({ error: 'Not found' }, 404));
  return app;
};
