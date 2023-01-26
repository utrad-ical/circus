import multer from '@koa/multer';
import { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import {
  DicomFileRepository,
  FunctionService,
  Logger
} from '@utrad-ical/circus-lib';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { RsWebsocketVolumeConnectionHandlerCreator } from '@utrad-ical/circus-rs/src/server/ws/createWebsocketVolumeConnectionHandlerCreator';
import withWebSocketConnectionHandlers from '@utrad-ical/circus-rs/src/server/ws/withWebSocketConnectionHandlers';
import { ErrorObject } from 'ajv';
import * as fs from 'fs-extra';
import glob from 'glob-promise';
import { safeLoad as yaml } from 'js-yaml';
import Koa, { Middleware } from 'koa';
import bodyParser from 'koa-bodyparser';
import compose from 'koa-compose';
import mount from 'koa-mount';
import Router from 'koa-router';
import { fetchUserFromToken } from './middleware/auth/createOauthServer';
import * as path from 'path';
import querystring from 'querystring';
import * as ws from 'ws';
import { MhdPacker } from './case/createMhdPacker';
import { TaskManager } from './createTaskManager';
import {
  Database,
  DicomImporter,
  DicomTagReader,
  Models,
  TransactionManager,
  Validator
} from './interface';
import checkPrivilege from './middleware/auth/checkPrivilege';
import fixUserMiddleware from './middleware/auth/fixUser';
import KoaOAuth2Server from './middleware/auth/KoaOAuth2Server';
import cors from './middleware/cors';
import errorHandler from './middleware/errorHandler';
import typeCheck from './middleware/typeCheck';
import validateInOut from './middleware/validateInOut';
import Storage from './storage/Storage';
import { Deps } from './typings/middlewares';
import { SeriesOrientationResolver } from 'utils/createSeriesOrientationResolver';

function handlerName(route: Route) {
  if (route.handler) return route.handler;
  return 'handle' + route.verb[0].toUpperCase() + route.verb.substr(1);
}

const formatValidationErrors = (errors: ErrorObject[]) => {
  return errors.map(err => `${err.dataPath} ${err.message}`).join('\n');
};

interface ManifestFile {
  routes: Route[];
}

interface Route {
  verb: string;
  path: string;
  handler?: string;
  forDebug?: boolean;
  expectedContentType?: string;
  requestSchema?: string | object;
  responseSchema?: string | object;
  noAuthentication?: boolean;
}

async function prepareApiRouter(
  apiDir: string,
  deps: Deps,
  debug: boolean,
  authMiddleware: Middleware
) {
  const router = new Router();
  const validator = deps.validator;

  const manifestFiles = await glob(apiDir);
  for (const manifestFile of manifestFiles) {
    const data = yaml(await fs.readFile(manifestFile, 'utf8')) as ManifestFile;
    try {
      await validator.validate('api', data);
    } catch (err: any) {
      throw new TypeError(
        `Meta schema error at ${manifestFile}.\n` +
          formatValidationErrors(err.errors)
      );
    }
    const dir = path.dirname(manifestFile);
    for (const route of data.routes) {
      if (route.forDebug && !debug) continue;
      const module = require(dir);
      const mainHandler = module[handlerName(route)];
      if (typeof mainHandler !== 'function') {
        throw new Error(
          `middleware ${handlerName(route)} for ${manifestFile} not found`
        );
      }
      const middlewareStack = compose([
        ...(route.noAuthentication ? [] : [authMiddleware]),
        typeCheck(route.expectedContentType),
        checkPrivilege(deps, route),
        validateInOut(validator, {
          requestSchema: route.requestSchema,
          responseSchema: route.responseSchema
        }),
        mainHandler(deps) // The processing function itself
      ]);
      // console.log(`  Register ${route.verb.toUpperCase()} on ${route.path}`);
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
 * Register each API endpoints to the router according YAML manifest files.
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
    rsWSServer: ws.Server;
    rsWebsocketVolumeConnectionHandlerCreator: RsWebsocketVolumeConnectionHandlerCreator;
    volumeProvider: VolumeProvider;
    dicomFileRepository: DicomFileRepository;
    dicomTagReader: DicomTagReader;
    dicomImporter: DicomImporter;
    taskManager: TaskManager;
    mhdPacker: MhdPacker;
    dicomVoxelDumper: DicomVoxelDumper;
    oauthServer: KoaOAuth2Server;
    transactionManager: TransactionManager;
    seriesOrientationResolver: SeriesOrientationResolver;
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
    taskManager,
    mhdPacker,
    dicomVoxelDumper,
    oauthServer,
    transactionManager,
    seriesOrientationResolver
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
    taskManager,
    mhdPacker,
    dicomVoxelDumper,
    transactionManager,
    seriesOrientationResolver
  };

  const apiDir = path.resolve(__dirname, 'api/**/*.yaml');

  const authMiddleware = fixUser
    ? fixUserMiddleware(deps, fixUser)
    : oauthServer.authenticate();

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
        multer({
          storage: multer.memoryStorage(),
          limits: { fileSize: deps.uploadFileSizeMaxBytes }
        }).array('files'),

        apiRouter.routes() as any as Middleware
      ])
    )
  );
  koa.use(mount('/login', compose([bodyParser(), oauthServer.token()])));

  const rs = new Router();
  rs.use('/series/:sid', rsSeriesRoutes as any);
  koa.use(mount('/rs', rs.routes() as any));
  withWebSocketConnectionHandlers(rsWSServer, {
    '/rs/ws/volume': rsWebsocketVolumeConnectionHandlerCreator({
      authFunctionProvider: req => {
        // Returns a function that checks if the user has the
        // privilege to access the volume.
        const { token } = querystring.decode(req.url?.split('?')[1] ?? '');
        if (typeof token !== 'string') return async () => false;
        const accessibleDomains = (async () => {
          const data = await fetchUserFromToken(token, models);
          if (
            !data ||
            new Date(data.accessTokenExpiresAt).getTime() < new Date().getTime()
          )
            return [];
          return data.user.userPrivileges.domains;
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
  'taskManager',
  'mhdPacker',
  'dicomVoxelDumper',
  'oauthServer',
  'transactionManager',
  'seriesOrientationResolver'
];

export default createApp;
