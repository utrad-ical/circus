import koa from 'koa';
import { UserPrivilegeInfo } from '../privilegeUtils';

declare module 'koa' {
  export interface Request {
    body?: any;
  }

  export interface ParametrizedContext<StateT = any, CustomT = {}> {
    user: any;
    userPrivileges: UserPrivilegeInfo;
  }
}
