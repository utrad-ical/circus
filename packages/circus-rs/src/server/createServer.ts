import koa from 'koa';
import httpStatus from 'http-status';
import Router from 'koa-router';
import koaJson from 'koa-json';

import { Configuration } from './Configuration';
import { AppHelpers } from './helper/prepareHelperModules';

// middleware
import cors from './app/middleware/cors';
import ipBasedAccessControl from './app/middleware/ipBasedAccessControl';
import errorHandler from './app/middleware/errorHandler';
import countUp from './app/middleware/countUp';

// basic routes
import serverStatus from './app/serverStatus';

// authentication
import issueSeriesAccessToken from './app/auth/issueSeriesAccessToken';
import checkSeriesAccessToken from './app/auth/checkSeriesAccessToken';

// application
import seriesRoutes from './app/series/seriesRoutes';

/**
 * Main server class.
 */
export default function createServer(
  config: Configuration,
  modules: AppHelpers
): koa {
  const { authorization, globalIpFilter } = config;
  const { logger, counter, authorizer, imageEncoder, volumeProvider } = modules;

  // create server process
  const app = new koa();

  // Set up global IP filter
  if (typeof globalIpFilter === 'string') {
    app.use(ipBasedAccessControl({ logger, allowPattern: globalIpFilter }));
  }

  // // Pretty-pring JSON output
  app.use(koaJson());

  // Adds an error handler which outputs all errors in JSON format
  app.use(errorHandler({ logger }));

  // Add global request handler
  app.use(cors());

  // Counts the number of requests
  app.use(countUp({ counter }));

  const router = new Router();
  router.get('/status', serverStatus({ config, modules }));

  // authorization
  if (authorizer) {
    router.get(
      '/token',
      issueSeriesAccessToken({
        logger,
        authorizer,
        ipFilter: authorization.tokenRequestIpFilter
      })
    );
    router.use('/series/:sid', checkSeriesAccessToken({ logger, authorizer }));
  }

  // series
  if (volumeProvider && imageEncoder) {
    router.use(
      '/series/:sid',
      seriesRoutes({
        logger,
        volumeProvider,
        imageEncoder
      })
    );
  }

  app.use(router.routes());

  // This is a default handler to catch all unknown requests of all types of verbs
  app.use(async (ctx: koa.DefaultContext, next: koa.Next) => {
    ctx.throw(httpStatus.NOT_FOUND);
  });

  return app;
}
