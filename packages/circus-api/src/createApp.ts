import multer from '@koa/multer';
import { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import {
  FunctionService,
  Logger,
  DicomFileRepository
} from '@utrad-ical/circus-lib';
import { ErrorObject } from 'ajv';
import * as fs from 'fs-extra';
import glob from 'glob-promise';
import { safeLoad as yaml } from 'js-yaml';
import Koa, { Middleware } from 'koa';
import bodyParser from 'koa-bodyparser';
import compose from 'koa-compose';
import mount from 'koa-mount';
import Router from 'koa-router';
import * as path from 'path';
import { DisposableDb, Validator, Models, DicomImporter } from './interface';
import checkPrivilege from './middleware/auth/checkPrivilege';
import fixUserMiddleware from './middleware/auth/fixUser';
import cors from './middleware/cors';
import errorHandler from './middleware/errorHandler';
import typeCheck from './middleware/typeCheck';
import validateInOut from './middleware/validateInOut';
import Storage from './storage/Storage';
import { Deps } from './typings/middlewares';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { TaskManager } from './createTaskManager';
import { MhdPacker } from './case/createMhdPacker';
import KoaOAuth2Server from './middleware/auth/KoaOAuth2Server';

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
    } catch (err) {
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
    db: DisposableDb;
    validator: Validator;
    apiLogger: Logger;
    models: Models;
    blobStorage: Storage;
    core: CsCore;
    rsSeriesRoutes: Koa.Middleware;
    volumeProvider: VolumeProvider;
    dicomFileRepository: DicomFileRepository;
    dicomImporter: DicomImporter;
    taskManager: TaskManager;
    mhdPacker: MhdPacker;
    dicomVoxelDumper: DicomVoxelDumper;
    oauthServer: KoaOAuth2Server;
  },
  CreateAppOptions
> = async (
  options,
  {
    db,
    validator,
    apiLogger: logger,
    models,
    blobStorage,
    core,
    rsSeriesRoutes,
    volumeProvider,
    dicomImporter,
    dicomFileRepository,
    taskManager,
    mhdPacker,
    dicomVoxelDumper,
    oauthServer
  }
) => {
  const {
    fixUser,
    debug,
    corsOrigin,
    pluginResultsPath,
    uploadFileSizeMaxBytes,
    dicomImageServerUrl
  } = options;
  // The main Koa instance.
  const koa = new Koa();

  const deps: Deps = {
    db,
    validator,
    logger,
    models,
    blobStorage,
    dicomFileRepository,
    dicomImporter,
    pluginResultsPath,
    cs: core,
    volumeProvider,
    uploadFileSizeMaxBytes,
    dicomImageServerUrl,
    taskManager,
    mhdPacker,
    dicomVoxelDumper
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

  return koa;
};

createApp.dependencies = [
  'db',
  'validator',
  'apiLogger',
  'models',
  'blobStorage',
  'core',
  'rsSeriesRoutes',
  'volumeProvider',
  'dicomFileRepository',
  'dicomImporter',
  'taskManager',
  'mhdPacker',
  'dicomVoxelDumper',
  'oauthServer'
];

export default createApp;
