import type { IncomingMessage, RequestListener } from 'node:http';
import Koa from 'koa';
import Router from 'koa-router';

interface Options {
  path: string;
  routes: Koa.Middleware;
  authorize: (request: IncomingMessage, seriesUid: string) => Promise<void>;
  onError: (error: unknown) => {
    status: number;
    body: unknown;
    headers?: Headers;
  };
}

/** Mounts the existing RS series handlers on a shared Node HTTP server. */
export const createSeriesRequestListener = ({
  path,
  routes,
  authorize,
  onError
}: Options): RequestListener => {
  const app = new Koa({ proxy: true });
  const router = new Router();

  app.use(async (ctx, next) => {
    try {
      await next();
      if (ctx.status === 404) ctx.throw(404, 'Not found');
    } catch (error) {
      const { status, body, headers } = onError(error);
      headers?.forEach((value, name) => ctx.set(name, value));
      ctx.body = body;
      ctx.status = status;
    }
  });
  router.use(
    path,
    async (ctx, next) => {
      await authorize(ctx.req, ctx.params.sid);
      await next();
    },
    routes
  );
  app.use(router.routes());
  return app.callback();
};
