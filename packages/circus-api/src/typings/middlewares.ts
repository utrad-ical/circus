import type createDockerFileExtractor from '../utils/dockerFileExtractor.ts';
import type { ParameterizedContext } from 'koa';
import type koa from 'koa';
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
import type { TaskManager } from '../createTaskManager.ts';
import type { MhdPacker } from '../case/createMhdPacker.ts';
import type { SeriesOrientationResolver } from '../utils/createSeriesOrientationResolver.ts';

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
  taskManager: TaskManager;
  mhdPacker: MhdPacker;
  dicomVoxelDumper: DicomVoxelDumper;
  transactionManager: TransactionManager;
  seriesOrientationResolver: SeriesOrientationResolver;
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

export type RouteMiddleware = (deps: Deps) => CircusMiddeware;
