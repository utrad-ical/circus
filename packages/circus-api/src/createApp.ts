import { createServer } from 'node:http';
import type { Server } from 'node:http';
import * as path from 'node:path';
import { parse } from 'node:querystring';
import { getRequestListener } from '@hono/node-server';
import { getCookie } from 'hono/cookie';
import type { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import type {
  DicomFileRepository,
  FunctionService,
  Logger
} from '@utrad-ical/circus-lib';
import type {
  RsServices,
  VolumeProvider,
  RsWebsocketVolumeConnectionHandlerCreator
} from '@utrad-ical/circus-rs/server';
import {
  attachWebSocketHandlers,
  createSeriesRequestListener
} from '@utrad-ical/circus-rs/server';
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
import type { RouteGroup } from './defineRoute.ts';
import type { CircusMiddleware, Deps } from './typings/middlewares.ts';
import type Storage from './storage/Storage.ts';
import type { SeriesOrientationResolver } from './utils/createSeriesOrientationResolver.ts';
import { resolveAccessToken } from './middleware/auth/resolveAccessToken.ts';
import {
  authenticateRequest,
  csrfHeaderName,
  expectedUserHeaderName,
  sessionCookieName,
  sessionFromRawRequest
} from './middleware/auth/session.ts';
import { getFixedUser } from './middleware/auth/fixUser.ts';
import checkPrivilege from './middleware/auth/checkPrivilege.ts';
import { formatError, httpError } from './middleware/errorHandler.ts';
import { typeCheck } from './middleware/typeCheck.ts';
import { respondJson, validateRequest } from './middleware/validateInOut.ts';
import { createHonoApp } from './createHonoApp.ts';
import glob from './utils/glob.ts';

async function registerRoutes(
  app: ReturnType<typeof createHonoApp>,
  deps: Deps,
  debug: boolean,
  authenticate: CircusMiddleware
) {
  const apiDir = path.resolve(import.meta.dirname, 'api/**/routes.ts');
  for (const file of await glob(apiDir)) {
    const { routes } = ((await import(file)) as { default: RouteGroup })
      .default;
    for (const route of routes) {
      if (route.forDebug && !debug) continue;
      const handler = route.handler(deps);
      // Koa-style named patterns in the API definitions also feed the API reference.
      const routePath = route.path.replace(/:(\w+)\+/g, ':$1{.+}');
      app.on(
        route.verb.toUpperCase(),
        ['/api' + routePath],
        ...(route.noAuthentication ? [] : [authenticate]),
        typeCheck(route.expectedContentType),
        checkPrivilege(deps, route),
        ...(route.request
          ? [validateRequest(deps.validator, route.request)]
          : []),
        ctx =>
          handler(ctx, (value, status) =>
            respondJson(ctx, deps.validator, route.response, value, status)
          )
      );
    }
  }
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

/** Creates the shared Node server for the Hono API and RS. */
export const createApp: FunctionService<
  Server,
  {
    database: Database;
    validator: Validator;
    apiLogger: Logger;
    models: Models;
    blobStorage: Storage;
    core: CsCore;
    rsSeriesRoutes: RsServices['rsSeriesRoutes'];
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

  const app = createHonoApp({ logger, debug, corsOrigin });
  const authenticate: CircusMiddleware = async (ctx, next) => {
    const json = ctx.var.jsonBody;
    const { user, userPrivileges, byCookie } = fixUser
      ? await getFixedUser(models, fixUser)
      : await authenticateRequest(models, {
          method: ctx.req.method,
          authorization: ctx.req.header('Authorization'),
          cookie: getCookie(ctx, sessionCookieName),
          csrf: ctx.req.header(csrfHeaderName),
          expectedUser: ctx.req.header(expectedUserHeaderName),
          misplacedToken:
            ctx.var.query.access_token ||
            (json &&
              typeof json === 'object' &&
              'access_token' in json &&
              json.access_token)
        });
    ctx.set('user', user);
    ctx.set('userPrivileges', userPrivileges);
    ctx.set('authenticatedBySessionCookie', byCookie);
    await next();
  };
  await registerRoutes(app, deps, debug, authenticate);

  const rsRequest = createSeriesRequestListener({
    path: '/rs/series/:sid',
    routes: rsSeriesRoutes,
    authorize: async (req, seriesUid) => {
      const headers = new Headers(req.headers as Record<string, string>);
      const { userPrivileges } = fixUser
        ? await getFixedUser(models, fixUser)
        : await authenticateRequest(models, {
            method: req.method ?? 'GET',
            authorization: headers.get('Authorization') ?? undefined,
            cookie: sessionFromRawRequest(headers.get('Cookie') ?? undefined),
            csrf: headers.get(csrfHeaderName) ?? undefined,
            expectedUser: headers.get(expectedUserHeaderName) ?? undefined,
            misplacedToken: parse(req.url?.split('?')[1] ?? '').access_token
          });
      const series = await models.series.findById(seriesUid);
      if (!series) throw httpError(404, 'Series not found.');
      if (!userPrivileges.domains.includes(series.domain)) {
        throw httpError(
          403,
          'You do not have privilege to access this series.'
        );
      }
    },
    onError: error => formatError(error, { includeErrorDetails: debug, logger })
  });
  const apiRequest = getRequestListener(app.fetch, {
    overrideGlobalObjects: false
  });
  const server = createServer((req, res) => {
    const pathname = req.url?.split('?', 1)[0];
    if (pathname === '/rs' || pathname?.startsWith('/rs/')) {
      if (corsOrigin) {
        if (corsOrigin !== '*') res.appendHeader('Vary', 'Origin');
        if (corsOrigin === '*' || corsOrigin === req.headers.origin) {
          res.setHeader('Access-Control-Allow-Origin', corsOrigin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
      }
      logger.trace('Request', req.method, pathname);
      rsRequest(req, res);
    } else {
      apiRequest(req, res);
    }
  });
  attachWebSocketHandlers(server, rsWSServer, {
    '/rs/ws/volume': rsWebsocketVolumeConnectionHandlerCreator({
      authFunctionProvider: req => {
        // Returns a function that checks if the user has the
        // privilege to access the volume.
        // The session cookie (web UI), or a token in the query string
        const { token: queryToken } = parse(req.url?.split('?')[1] ?? '');
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
  });
  return server;
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
