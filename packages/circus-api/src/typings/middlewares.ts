import koa, { ParameterizedContext } from 'koa';
import mongo from 'mongodb';
import { Validator, DicomImporter } from '../interface';
import { Models } from '../interface';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import Storage from '../storage/Storage';
import { UserPrivilegeInfo } from '../privilegeUtils';
import { CsCore } from '@utrad-ical/circus-cs-core';
import { Logger, DicomFileRepository } from '@utrad-ical/circus-lib';

export interface Deps {
  validator: Validator;
  db: mongo.Db;
  logger: Logger;
  models: Models;
  blobStorage: Storage;
  dicomFileRepository: DicomFileRepository;
  dicomImporter: DicomImporter;
  pluginResultsPath: string;
  cs: CsCore;
  volumeProvider: VolumeProvider;
  uploadFileSizeMaxBytes: number;
  dicomImageServerUrl: string;
}

interface CustomCtxMembers {
  params: { [key: string]: string };
  user: any;
  project: any;
  case: any;
  job: any;
  userPrivileges: UserPrivilegeInfo;
}

export type CircusContext = ParameterizedContext<any, CustomCtxMembers>;

export type CircusMiddeware = koa.Middleware<any, CustomCtxMembers>;

export type RouteMiddleware = (deps: Deps) => CircusMiddeware;
