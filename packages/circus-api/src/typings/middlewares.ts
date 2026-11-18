import type createDockerFileExtractor from '../utils/dockerFileExtractor.ts';
import type { Context, MiddlewareHandler } from 'hono';
import type { HttpBindings } from '@hono/node-server';
import type { z } from 'zod';
import type { RouteDefinition } from '../defineRoute.ts';
import type {
  Validator,
  DicomTagReader,
  DicomImporter,
  Database,
  TransactionManager
} from '../interface.ts';
import type { Models } from '../interface.ts';
import type { VolumeProvider } from '@utrad-ical/circus-rs/server';
import type Storage from '../storage/Storage.ts';
import type { UserPrivilegeInfo } from '../privilegeUtils.ts';
import type { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import type { Logger, DicomFileRepository } from '@utrad-ical/circus-lib';
import type { MhdPacker } from '../case/createMhdPacker.ts';
import type { ProgressManager } from '../createProgressManager.ts';
import type { SeriesOrientationResolver } from '../utils/createSeriesOrientationResolver.ts';
import type { VerifyUser } from '../middleware/auth/createVerifyUser.ts';
import type { QueryParameters } from '../utils/parseQuery.ts';

export interface Deps {
  validator: Validator;
  database: Database;
  logger: Logger;
  models: Models;
  blobStorage: Storage;
  dicomFileRepository: DicomFileRepository;
  dicomTagReader: DicomTagReader;
  dicomImporter: DicomImporter;
  pluginResultsPath: string;
  pluginCachePath: string;
  cs: CsCore;
  volumeProvider: VolumeProvider;
  uploadFileSizeMaxBytes: number;
  dicomImageServerUrl: string;
  progressManager: ProgressManager;
  mhdPacker: MhdPacker;
  dicomVoxelDumper: DicomVoxelDumper;
  transactionManager: TransactionManager;
  seriesOrientationResolver: SeriesOrientationResolver;
  /** Verifies a user name and a password (or a onetime password) */
  verifyUser: VerifyUser;
  /** Replaceable in tests; defaults to the real Docker-based extractor */
  createDockerFileExtractor?: typeof createDockerFileExtractor;
}

type DocumentOf<K extends keyof Models> = Awaited<
  ReturnType<Models[K]['findById']>
>;

export interface ApiEnv {
  Bindings: HttpBindings;
  Variables: {
    requestId: string;
    requestLogger: Logger;
    query: QueryParameters;
    jsonBody: unknown;
    user: DocumentOf<'user'>;
    userPrivileges: UserPrivilegeInfo;
    authenticatedBySessionCookie: boolean;
    project: DocumentOf<'project'>;
    plugin: DocumentOf<'plugin'>;
    clinicalCase: DocumentOf<'clinicalCase'>;
    job: DocumentOf<'pluginJob'>;
  };
}

export type CircusContext = Context<ApiEnv>;
export type CircusMiddleware = MiddlewareHandler<ApiEnv>;

/** The decoded value of a route schema. */
type OutputOf<S> = S extends z.ZodType ? z.output<S> : unknown;

export type RouteContext<R extends RouteDefinition> = Context<
  ApiEnv,
  R['path'],
  { out: { json: OutputOf<R['request']> } }
>;

type JsonResponse<S> = (
  body: OutputOf<S>,
  status?: number
) => Promise<Response>;

/** A route handler receives its validated input and a schema-aware JSON responder. */
export type RouteMiddleware<R extends RouteDefinition> = (
  deps: Deps
) => (
  ctx: RouteContext<R>,
  json: JsonResponse<R['response']>
) => Promise<Response>;
