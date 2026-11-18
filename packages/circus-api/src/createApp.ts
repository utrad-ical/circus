import { createServer } from 'node:http';
import type { Server } from 'node:http';
import * as path from 'node:path';
import { getRequestListener } from '@hono/node-server';
import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
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
import { attachWebSocketHandlers } from '@utrad-ical/circus-rs/server';
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
import { httpError } from './middleware/errorHandler.ts';
import { typeCheck } from './middleware/typeCheck.ts';
import { respondJson, validateRequest } from './middleware/validateInOut.ts';
import { createHonoApp } from './createHonoApp.ts';
import glob from './utils/glob.ts';
import { parseQuery } from './utils/parseQuery.ts';

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
      app.on(
        route.verb.toUpperCase(),
        ['/api' + route.path],
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
    logger: Logger;
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
    logger,
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
  const getAuthenticatedUser = (ctx: Context, misplacedToken: unknown) =>
    fixUser
      ? getFixedUser(models, fixUser)
      : authenticateRequest(models, {
          method: ctx.req.method,
          authorization: ctx.req.header('Authorization'),
          cookie: getCookie(ctx, sessionCookieName),
          csrf: ctx.req.header(csrfHeaderName),
          expectedUser: ctx.req.header(expectedUserHeaderName),
          misplacedToken
        });
  const authenticate: CircusMiddleware = async (ctx, next) => {
    const json = ctx.var.jsonBody;
    const misplacedToken =
      ctx.var.query.access_token ||
      (json &&
        typeof json === 'object' &&
        'access_token' in json &&
        json.access_token);
    const { user, userPrivileges, byCookie } = await getAuthenticatedUser(
      ctx,
      misplacedToken
    );
    ctx.set('user', user);
    ctx.set('userPrivileges', userPrivileges);
    ctx.set('authenticatedBySessionCookie', byCookie);
    await next();
  };
  await registerRoutes(app, deps, debug, authenticate);
  app.route(
    '/rs/series',
    rsSeriesRoutes(async (ctx, next) => {
      const { userPrivileges } = await getAuthenticatedUser(
        ctx,
        parseQuery(ctx.req.url).access_token
      );
      const seriesUid = ctx.req.param('sid')!;
      const series = await models.series.findById(seriesUid);
      if (!series) throw httpError(404, 'Series not found.');
      if (!userPrivileges.domains.includes(series.domain)) {
        throw httpError(
          403,
          'You do not have privilege to access this series.'
        );
      }
      await next();
    })
  );

  const server = createServer(
    getRequestListener(app.fetch, { overrideGlobalObjects: false })
  );
  attachWebSocketHandlers(
    server,
    rsWSServer,
    logger.child({ component: 'rs' }),
    {
      '/rs/ws/volume': rsWebsocketVolumeConnectionHandlerCreator({
        authFunctionProvider: req => {
          // Returns a function that checks if the user has the
          // privilege to access the volume.
          // The session cookie (web UI), or a token in the query string
          const { token: queryToken } = parseQuery(req.url ?? '/');
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
    }
  );
  return server;
};

createApp.dependencies = [
  'database',
  'validator',
  'logger',
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
