import koa from 'koa';
import type { UserPrivilegeInfo } from '../privilegeUtils.ts';

declare module 'koa' {
  export interface Request {
    body?: any;
  }

  export interface ParametrizedContext<StateT = any, CustomT = {}> {
    user: any;
    userPrivileges: UserPrivilegeInfo;
  }
}
