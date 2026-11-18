import type { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import type {
  DicomFileRepository,
  FunctionService,
  Logger
} from '@utrad-ical/circus-lib';
import type { VolumeProvider } from '@utrad-ical/circus-rs/server';
import type { RsWebsocketVolumeConnectionHandlerCreator } from '@utrad-ical/circus-rs/server';
import { withWebSocketConnectionHandlers } from '@utrad-ical/circus-rs/server';
import glob from './utils/glob.ts';
import type { Middleware } from 'koa';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compose from 'koa-compose';
import mount from 'koa-mount';
import Router from 'koa-router';
import { resolveAccessToken } from './middleware/auth/resolveAccessToken.ts';
import {
  authenticateRequest,
  sessionFromRawRequest
} from './middleware/auth/session.ts';
import * as path from 'path';
import querystring from 'querystring';
import type * as ws from 'ws';
import type { MhdPacker } from './case/createMhdPacker.ts';
import type { ProgressManager } from './createProgressManager.ts';
import type {
  Database,
  DicomImporter,
  DicomTagReader,
  Models,
  TransactionManager,
  Validator
} from './interface.ts';
import checkPrivilege from './middleware/auth/checkPrivilege.ts';
import fixUserMiddleware from './middleware/auth/fixUser.ts';
import cors from './middleware/cors.ts';
import type { RouteGroup } from './defineRoute.ts';
import errorHandler from './middleware/errorHandler.ts';
import typeCheck from './middleware/typeCheck.ts';
import validateInOut from './middleware/validateInOut.ts';
import type Storage from './storage/Storage.ts';
import type { Deps } from './typings/middlewares.ts';
import type { SeriesOrientationResolver } from './utils/createSeriesOrientationResolver.ts';

async function prepareApiRouter(
  pattern: string,
  deps: Deps,
  debug: boolean,
  authMiddleware: Middleware
) {
  const router = new Router();
  const validator = deps.validator;

  const routeFiles = await glob(pattern);
  for (const routeFile of routeFiles) {
    const { routes } = ((await import(routeFile)) as { default: RouteGroup })
      .default;
    for (const route of routes) {
      if (route.forDebug && !debug) continue;
      const middlewareStack = compose([
        ...(route.noAuthentication ? [] : [authMiddleware]),
        typeCheck(route.expectedContentType),
        checkPrivilege(deps, route),
        validateInOut(validator, {
          requestSchema: route.request,
          responseSchema: route.response
        }),
        route.handler(deps) // The processing function itself
      ]);
      (router as any)[route.verb](route.path, middlewareStack);
    }
  }

  return router;
}

interface CreateAppOptions {
  debug: boolean;
  fixUser?: string;
  corsOrigin?: string;
  pluginResultsPath: string;
  pluginCachePath: string;
  dicomImageServerUrl: string;
  uploadFileSizeMaxBytes: number;
}

/**
 * Builds a Koa app and sets up the router.
 * Registers the API routes defined in `routes.ts` of each directory under `api`.
 */
export const createApp: FunctionService<
  Koa,
  {
    database: Database;
    validator: Validator;
    apiLogger: Logger;
    models: Models;
    blobStorage: Storage;
    core: CsCore;
    rsSeriesRoutes: Koa.Middleware;
    rsWSServer: ws.WebSocketServer;
    rsWebsocketVolumeConnectionHandlerCreator: RsWebsocketVolumeConnectionHandlerCreator;
    volumeProvider: VolumeProvider;
    dicomFileRepository: DicomFileRepository;
    dicomTagReader: DicomTagReader;
    dicomImporter: DicomImporter;
    progressManager: ProgressManager;
    mhdPacker: MhdPacker;
    dicomVoxelDumper: DicomVoxelDumper;
    verifyUser: Deps['verifyUser'];
    transactionManager: TransactionManager;
    seriesOrientationResolver: SeriesOrientationResolver;
    /** Only used by tests */
    createDockerFileExtractor?: Deps['createDockerFileExtractor'];
  },
  CreateAppOptions
> = async (
  options,
  {
    database: database,
    validator,
    apiLogger: logger,
    models,
    blobStorage,
    core,
    rsSeriesRoutes,
    rsWSServer,
    rsWebsocketVolumeConnectionHandlerCreator,
    volumeProvider,
    dicomImporter,
    dicomFileRepository,
    dicomTagReader,
    progressManager,
    mhdPacker,
    dicomVoxelDumper,
    verifyUser,
    transactionManager,
    seriesOrientationResolver,
    createDockerFileExtractor
  }
) => {
  const {
    fixUser,
    debug,
    corsOrigin,
    pluginResultsPath,
    pluginCachePath,
    uploadFileSizeMaxBytes,
    dicomImageServerUrl
  } = options;
  // The main Koa instance.
  const koa = new Koa();

  const deps: Deps = {
    database,
    validator,
    logger,
    models,
    blobStorage,
    dicomFileRepository,
    dicomTagReader,
    dicomImporter,
    pluginResultsPath,
    pluginCachePath,
    cs: core,
    volumeProvider,
    uploadFileSizeMaxBytes,
    dicomImageServerUrl,
    progressManager,
    mhdPacker,
    dicomVoxelDumper,
    transactionManager,
    seriesOrientationResolver,
    createDockerFileExtractor,
    verifyUser
  };

  const apiDir = path.resolve(import.meta.dirname, 'api/**/routes.ts');

  // Accepts either a Bearer token (API clients) or the session cookie (web UI)
  const authMiddleware = fixUser
    ? fixUserMiddleware(deps, fixUser)
    : authenticateRequest(models);

  const apiRouter = await prepareApiRouter(apiDir, deps, debug, authMiddleware);

  // Trust proxy headers such as X-Forwarded-For
  koa.proxy = true;

  // Register middleware stack to the Koa app.
  koa.use(errorHandler({ includeErrorDetails: debug, logger }));
  koa.use(cors(corsOrigin));
  koa.use(
    mount(
      '/api',
      compose([
        (async (ctx, next) => {
          if (ctx.method === 'OPTIONS') {
            ctx.body = null;
            ctx.status = 200;
          } else await next();
        }) as Middleware,
        bodyParser({
          enableTypes: ['json'],
          jsonLimit: '1mb',
          onerror: (err, ctx) =>
            ctx.throw(400, 'Invalid JSON as request body.\n' + err.message)
        }),
        apiRouter.routes() as any as Middleware
      ])
    )
  );

  const rs = new Router();
  rs.use(
    '/series/:sid',
    authMiddleware as any,
    // The user must be able to access the domain of the series
    (async (ctx: any, next: Koa.Next) => {
      const series = await models.series.findById(ctx.params.sid);
      if (!series) ctx.throw(404, 'Series not found.');
      if (!ctx.userPrivileges.domains.includes(series.domain)) {
        ctx.throw(403, 'You do not have privilege to access this series.');
      }
      await next();
    }) as any,
    rsSeriesRoutes as any
  );
  koa.use(mount('/rs', rs.routes() as any));
  withWebSocketConnectionHandlers(rsWSServer, {
    '/rs/ws/volume': rsWebsocketVolumeConnectionHandlerCreator({
      authFunctionProvider: req => {
        // Returns a function that checks if the user has the
        // privilege to access the volume.
        // The session cookie (web UI), or a token in the query string
        const { token: queryToken } = querystring.decode(
          req.url?.split('?')[1] ?? ''
        );
        const token =
          sessionFromRawRequest(req.headers.cookie) ??
          (typeof queryToken === 'string' ? queryToken : undefined);
        if (!token) return async () => false;
        const accessibleDomains = (async () => {
          const result = await resolveAccessToken(models, token);
          return result.ok ? result.userPrivileges.domains : [];
        })();
        return async seriesUid => {
          const domains = await accessibleDomains;
          const series = await models.series.findById(seriesUid);
          if (!series) return false;
          return domains.includes(series.domain);
        };
      }
    })
  })(koa);

  return koa;
};

createApp.dependencies = [
  'database',
  'validator',
  'apiLogger',
  'models',
  'blobStorage',
  'core',
  'rsSeriesRoutes',
  'rsWSServer',
  'rsWebsocketVolumeConnectionHandlerCreator',
  'volumeProvider',
  'dicomFileRepository',
  'dicomTagReader',
  'dicomImporter',
  'progressManager',
  'mhdPacker',
  'dicomVoxelDumper',
  'verifyUser',
  'transactionManager',
  'seriesOrientationResolver'
];

export default createApp;
