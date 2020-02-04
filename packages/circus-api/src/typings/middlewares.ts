import koa, { ParameterizedContext } from 'koa';
import mongo from 'mongodb';
import { Validator } from '../createValidator';
import { Models } from '../db/createModels';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { DicomImporter } from '../createDicomImporter';
import Storage from '../storage/Storage';
import { UserPrivilegeInfo } from '../privilegeUtils';
import { CsCore } from '@utrad-ical/circus-cs-core';

export interface Deps {
  validator: Validator;
  db: mongo.Db;
  logger: Logger;
  models: Models;
  blobStorage: Storage;
  dicomImporter: DicomImporter;
  pluginResultsPath: string;
  cs: CsCore;
  volumeProvider: VolumeProvider;
  uploadFileSizeMaxBytes: number;
  dicomImageServerUrl: string;
}

interface CustomCtxMembers {
  users: any;
  userPrivileges: UserPrivilegeInfo;
}

export type CircusContext = ParameterizedContext<any, CustomCtxMembers>;

export type CircusMiddeware = koa.Middleware<any, CustomCtxMembers>;

export type RouteMiddleware = (deps: Deps) => CircusMiddeware;
