import koa from 'koa';
import mongo from 'mongodb';
import { Validator } from '../createValidator';
import { Models } from '../db/createModels';

declare module 'koa' {
  export interface Request {
    body: any;
  }
}

interface Deps {
  db: mongo.Db;
  validator: Validator;
  models: Models;
}

interface CustomCtxMembers {
  user: any;
  userPrivileges: any;
}

type RouteMiddleware = (deps: Deps) => koa.Middleware<any, CustomCtxMembers>;
