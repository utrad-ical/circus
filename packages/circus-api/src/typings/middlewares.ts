import koa, { ParameterizedContext } from 'koa';
import {
  Validator,
  DicomTagReader,
  DicomImporter,
  Database,
  TransactionManager
} from '../interface';
import { Models } from '../interface';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import Storage from '../storage/Storage';
import { UserPrivilegeInfo } from '../privilegeUtils';
import { CsCore, DicomVoxelDumper } from '@utrad-ical/circus-cs-core';
import { Logger, DicomFileRepository } from '@utrad-ical/circus-lib';
import { TaskManager } from '../createTaskManager';
import { MhdPacker } from '../case/createMhdPacker';
import { SeriesOrientationResolver } from 'utils/createSeriesOrientationResolver';

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
