import Koa, { Middleware } from 'koa';
import bodyParser from 'koa-bodyparser';
import multer from 'koa-multer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { safeLoad as yaml } from 'js-yaml';
import glob from 'glob-promise';
import Router from 'koa-router';
import mount from 'koa-mount';
import createOauthServer from './middleware/auth/createOauthServer';
import fixUserMiddleware from './middleware/auth/fixUser';
import errorHandler from './middleware/errorHandler';
import cors from './middleware/cors';
import checkPrivilege from './middleware/auth/checkPrivilege';
import typeCheck from './middleware/typeCheck';
import createValidator, { Validator } from './createValidator';
import createStorage from './storage/createStorage';
import createLogger from './createLogger';
import validateInOut from './middleware/validateInOut';
import createModels, { Models } from './db/createModels';
import compose from 'koa-compose';
import DicomImporter from './DicomImporter';
import circusRs from './circusRs';
import {
  StaticDicomFileRepository,
  MemoryDicomFileRepository
} from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import configureServiceLoader from '@utrad-ical/circus-cs-core/src/configureServiceLoader';
import csCoreConfigDefaults from '@utrad-ical/circus-cs-core/src/config/default';
import os from 'os';
import mongo from 'mongodb';
import { ErrorObject } from 'ajv';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import Storage from './storage/Storage';

function handlerName(route: Route) {
  if (route.handler) return route.handler;
  return 'handle' + route.verb[0].toUpperCase() + route.verb.substr(1);
}

const formatValidationErrors = (errors: ErrorObject[]) => {
  return errors.map(err => `${err.dataPath} ${err.message}`).join('\n');
};

interface Deps {
  validator: Validator;
  db: mongo.Db;
  logger: Logger;
  models: Models;
  blobStorage: Storage;
  dicomImporter?: DicomImporter;
  pluginResultsPath: string;
  cs: any;
  volumeProvider: any;
  uploadFileSizeMax: string;
  dicomImageServerUrl: string;
}

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
}

async function prepareApiRouter(
  apiDir: string,
  deps: Deps,
  options: CreateAppOptions
) {
  const { debug } = options;
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

export async function createBlobStorage(blobPath?: string) {
  return blobPath
    ? await createStorage('local', { root: blobPath })
    : await createStorage('memory');
}

export async function createDicomFileRepository(dicomPath?: string) {
  return dicomPath
    ? new StaticDicomFileRepository({ dataDir: dicomPath })
    : new MemoryDicomFileRepository({});
}

export const makeCsCoreFromServiceLoader = async (
  options: Pick<CreateAppOptions, 'pluginResultsPath' | 'dicomPath'>
) => {
  const mongoUrl = process.env.CIRCUS_MONGO_URL || process.env.MONGO_URL;
  const configObj = {
    jobRunner: {
      options: {
        workingDirectory: path.join(os.tmpdir(), 'circus-cs'),
        removeTemporaryDirectory: false
      }
    },
    pluginDefinitionAccessor: {
      type: 'MongoPluginDefinitionAccessor',
      options: { mongoUrl, collectionName: 'pluginDefinitions' }
    },
    queue: {
      type: 'MongoQueue',
      options: { mongoUrl, collectionName: 'pluginJobQueue' }
    },
    jobManager: csCoreConfigDefaults.jobManager,
    jobReporter: {
      type: 'MongoPluginJobReporter',
      options: {
        mongoUrl,
        collectionName: 'pluginJobs',
        pluginResultsDir: options.pluginResultsPath
      }
    },
    dicomFileRepository: {
      module: 'StaticDicomFileRepository',
      options: { dataDir: options.dicomPath, useHash: false }
    }
  };
  const loader = configureServiceLoader(
    new ServiceLoader(configObj),
    configObj
  );
  return await loader.get('core');
};

interface CreateAppOptions {
  debug: boolean;
  db: mongo.Db;
  cs: any;
  fixUser?: string;
  blobPath?: string;
  corsOrigin?: string;
  dicomPath?: string;
  pluginResultsPath: string;
  dicomImageServerUrl: string;
}

/**
 * Creates a new Koa app.
 */
export default async function createApp(options: CreateAppOptions) {
  const {
    debug,
    db,
    cs,
    fixUser,
    blobPath,
    corsOrigin,
    dicomPath,
    pluginResultsPath,
    dicomImageServerUrl
  } = options;

  // The main Koa instance.
  const koa = new Koa();

  // Trust proxy headers such as X-Forwarded-For
  koa.proxy = true;

  const validator = await createValidator();
  const models = createModels(db, validator);
  const blobStorage = await createBlobStorage(blobPath);

  const dicomFileRepository = await createDicomFileRepository(dicomPath);

  const logger = createLogger();

  const utilityEnv = process.env.DICOM_UTILITY;
  const dicomImporter = utilityEnv
    ? new DicomImporter(dicomFileRepository, models, { utility: utilityEnv })
    : undefined;

  const { rs, volumeProvider } = await circusRs({
    logger,
    dicomFileRepository
  });

  // Build a router.
  // Register each API endpoints to the router according YAML manifest files.
  const deps: Deps = {
    validator,
    db,
    logger,
    models,
    blobStorage,
    dicomImporter,
    pluginResultsPath,
    cs,
    volumeProvider,
    uploadFileSizeMax: '200mb',
    dicomImageServerUrl
  };

  const apiDir = path.resolve(__dirname, 'api/**/*.yaml');
  const apiRouter = await prepareApiRouter(apiDir, deps, options);

  const oauth = createOauthServer(models);

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
          limits: deps.uploadFileSizeMax as any // TODO: update to @koa/multer
        }).array('files'),
        fixUser ? fixUserMiddleware(deps, fixUser) : oauth.authenticate(),
        apiRouter.routes() as Middleware
      ])
    )
  );
  koa.use(mount('/login', compose([bodyParser(), oauth.token()])));

  koa.use(mount('/rs', rs as Middleware));

  return koa;
}
