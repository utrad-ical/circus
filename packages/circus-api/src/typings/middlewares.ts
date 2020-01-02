import koa from 'koa';
import mongo from 'mongodb';
import { Validator } from '../createValidator';
import { Models } from '../db/createModels';

export interface RouteMiddlewareDeps {
  db: mongo.Db;
  validator: Validator;
  models: Models;
}

interface CustomCtxMembers {
  users: any;
  userPrivileges: {
    globalPrivileges: string[];
    accessibleProjects: any[];
  };
}

export type CircusMiddeware = koa.Middleware<any, CustomCtxMembers>;

export type RouteMiddleware = (deps: RouteMiddlewareDeps) => CircusMiddeware;
