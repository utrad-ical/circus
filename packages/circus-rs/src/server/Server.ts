import Counter from './Counter';
import ImageEncoder from './image-encoders/ImageEncoder';

import DicomVolume from '../common/DicomVolume';
import AsyncLruCache from '../common/AsyncLruCache';

import Logger from './loggers/Logger';
import AuthorizationCache from './auth/AuthorizationCache';
import { ServerHelpers } from './ServerHelpers';

import Koa from 'koa';
import Router from 'koa-router';
import compose from 'koa-compose';
import koaJson from 'koa-json';
import tokenAuthentication from './routes/middleware/TokenAuthorization';
import ipBasedAccessControl from './routes/middleware/IpBasedAccessControl';
import loadSeries from './routes/middleware/LoadSeries';
import errorHandler from './routes/middleware/ErrorHandler';
import countUp from './routes/middleware/CountUp';
import StatusError from './routes/Error';

export type DicomReader = AsyncLruCache<DicomVolume>;

import metadata from './routes/series/metadata';
import scan from './routes/series/scan';
import volume from './routes/series/volume';

export function createSeriesRouter(helpers: ServerHelpers): Router {
  const router = new Router();
  router.get('/metadata', metadata(helpers));
  router.get('/scan', scan(helpers));
  router.get('/volume', volume(helpers));
  return router;
}

function loadRoute(moduleName: string, helpers: ServerHelpers): Koa.Middleware {
  const middleware = require(`./routes/${moduleName}`).default;
  return middleware(helpers);
}

type CreateServerOptions = {
  logger: Logger;
  imageEncoder: ImageEncoder;
  seriesReader: DicomReader;
  loadedModuleNames: string[];
  authorization?: any;
  globalIpFilter?: string;
};

/**
 * Main server class.
 */
export default function createServer(opts: CreateServerOptions): Koa {
  const helpers: ServerHelpers = {
    logger: opts.logger,
    seriesReader: opts.seriesReader,
    imageEncoder: opts.imageEncoder,
    authorizationCache: new AuthorizationCache(opts.authorization),
    counter: new Counter()
  };
  const { authorization, loadedModuleNames, globalIpFilter } = opts;

  const locals: any = {};

  helpers.logger.info('Modules loaded: ', loadedModuleNames.join(', '));

  // create server process
  const app = new Koa();
  locals.loadedModuleNames = loadedModuleNames;

  const useAuth = !!authorization.enabled;
  locals.authorizationEnabled = useAuth;

  // Set up global IP filter
  if (typeof globalIpFilter === 'string') {
    app.use(ipBasedAccessControl(helpers, globalIpFilter));
  }

  // Pretty-pring JSON output
  app.use(koaJson());

  // Adds an error handler which outputs all errors in JSON format
  app.use(errorHandler(helpers.logger));

  // Add global request handler
  app.use(async (ctx, next) => {
    // Always append the following header
    ctx.response.set('Access-Control-Allow-Origin', '*');
    helpers.logger.info(ctx.request.url, ctx.request.hostname);
    ctx.state.locals = locals;
    await next();
  });

  // Counts the number of requests
  app.use(countUp(helpers));

  const router = new Router();
  router.get('/status', loadRoute('ServerStatus', helpers));

  // Set up 'token' route
  if (useAuth) {
    const ipBlockerMiddleware = ipBasedAccessControl(
      helpers,
      authorization.tokenRequestIpFilter
    );
    router.get(
      '/token',
      compose([ipBlockerMiddleware, loadRoute('RequestToken', helpers)])
    );
  }

  router.options('/series/*', async (ctx, next) => {
    ctx.status = 200;
    ctx.response.set('Access-Control-Allow-Methods', 'GET');
    ctx.response.set('Access-Control-Allow-Headers', 'Authorization');
    await next();
  });
  const token = useAuth ? [tokenAuthentication(helpers)] : [];
  const load = loadSeries(helpers);

  const seriesRouter = createSeriesRouter(helpers);

  router.use('/series/:sid', compose([...token, load]));
  router.use('/series/:sid', seriesRouter.routes());

  // Assign the router
  app.use(router.routes());

  // This is a default handler to catch all unknown requests of all types of verbs
  app.use(async (ctx, next) => {
    throw StatusError.notFound('Not found');
  });

  return app;
}
