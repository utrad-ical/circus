import { createServer as createHttpServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { prettyJSON } from 'hono/pretty-json';
import type { FunctionService } from '@utrad-ical/circus-lib';
import type { RsServerOptions } from './Configuration.ts';
import type { RsServices } from './configureServiceLoader.ts';
import type { RsEnv } from './types.ts';
import ipBasedAccessControl from './app/middleware/ipBasedAccessControl.ts';
import errorHandler from './app/middleware/errorHandler.ts';
import serverStatus from './app/serverStatus.ts';
import issueSeriesAccessToken from './app/auth/issueSeriesAccessToken.ts';
import checkSeriesAccessToken from './app/auth/checkSeriesAccessToken.ts';
import createAuthorizer from './helper/createAuthorizer.ts';
import { attachWebSocketHandlers } from './ws/attachWebSocketHandlers.ts';

const createServer: FunctionService<
  RsServices['rsServer'],
  RsServices,
  RsServerOptions
> = async (options, deps) => {
  const { authorization, globalIpFilter } = options;
  const {
    logger,
    counter,
    rsSeriesRoutes,
    rsWebsocketVolumeConnectionHandlerCreator,
    rsWSServer
  } = deps;
  const app = new Hono<RsEnv>({ strict: false });
  if (typeof globalIpFilter === 'string') {
    app.use(
      ipBasedAccessControl({
        logger,
        allowPattern: globalIpFilter,
        plainText: true
      })
    );
  }
  app.use(prettyJSON());
  app.use(async (ctx, next) => {
    counter.countUp(ctx.req.path.split('/').at(-1)!);
    await next();
    if (ctx.req.method === 'HEAD') {
      void ctx.res.body
        ?.cancel()
        .catch(err => logger.error({ err }, 'Failed to cancel HEAD response'));
    }
  });
  app.use(
    cors({
      origin: '*',
      allowMethods: ['GET'],
      allowHeaders: ['Authorization'],
      credentials: true,
      maxAge: 86400
    })
  );
  app.onError(errorHandler(logger));
  app.notFound(() => {
    throw new HTTPException(404, { message: 'Not Found' });
  });
  app.get('/status', serverStatus({ config: options, modules: deps }));

  const authorizer = authorization?.enabled
    ? createAuthorizer(authorization)
    : undefined;
  if (authorizer) {
    app.get(
      '/token',
      ...issueSeriesAccessToken({
        logger,
        authorizer,
        ipFilter: authorization?.tokenRequestIpFilter
      })
    );
  }
  app.route(
    '/series',
    rsSeriesRoutes(
      authorizer ? checkSeriesAccessToken({ logger, authorizer }) : undefined
    )
  );

  const server: RsServices['rsServer'] = createHttpServer(
    getRequestListener(app.fetch, { overrideGlobalObjects: false })
  );
  if (authorizer?.dispose) server.dispose = authorizer.dispose;
  attachWebSocketHandlers(server, rsWSServer, logger, {
    '/ws/volume': rsWebsocketVolumeConnectionHandlerCreator({
      authFunctionProvider: () => () =>
        new Promise(resolve => {
          setTimeout(() => resolve(true), 2000);
        })
    })
  });
  return server;
};

createServer.dependencies = [
  'logger',
  'counter',
  'rsSeriesRoutes',
  'rsWSServer',
  'rsWebsocketVolumeConnectionHandlerCreator'
];

export default createServer;
