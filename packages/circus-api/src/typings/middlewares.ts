import type createDockerFileExtractor from '../utils/dockerFileExtractor.ts';
import type { ParameterizedContext } from 'koa';
import type koa from 'koa';
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

interface CustomCtxMembers {
  params: { [key: string]: string };
  user: any;
  project: any;
  plugin: any;
  case: any;
  job: any;
  userPrivileges: UserPrivilegeInfo;
}

export type CircusContext = ParameterizedContext<any, CustomCtxMembers>;

export type CircusMiddeware = koa.Middleware<any, CustomCtxMembers>;

/** The output type of the schema, or `unknown` without a schema */
type OutputOf<S> = S extends z.ZodType ? z.output<S> : unknown;

/**
 * The context of a route handler, where the request body and the response
 * body are typed with the schemas of the route.
 */
export type RouteContext<R extends RouteDefinition> = Omit<
  CircusContext,
  'request' | 'body'
> & {
  request: Omit<CircusContext['request'], 'body'> & {
    body: OutputOf<R['request']>;
  };
  /** A route that returns a stream or a file has no response schema */
  body: OutputOf<R['response']> | null;
};

/**
 * A route handler. Pass the route definition to type the request
 * and the response, e.g., `RouteMiddleware<typeof getGroup>`.
 */
export type RouteMiddleware<R extends RouteDefinition | undefined = undefined> =
  (
    deps: Deps
  ) => R extends RouteDefinition
    ? (ctx: RouteContext<R>, next: koa.Next) => Promise<void>
    : CircusMiddeware;
