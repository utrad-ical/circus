import koa from 'koa';
import mongo from 'mongodb';
import { Validator } from '../createValidator';
import { Models } from '../db/createModels';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import DicomImporter from '../DicomImporter';
import Storage from '../storage/Storage';

export interface Deps {
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

interface CustomCtxMembers {
  users: any;
  userPrivileges: {
    globalPrivileges: string[];
    accessibleProjects: any[];
  };
}

export type CircusMiddeware = koa.Middleware<any, CustomCtxMembers>;

export type RouteMiddleware = (deps: Deps) => CircusMiddeware;
