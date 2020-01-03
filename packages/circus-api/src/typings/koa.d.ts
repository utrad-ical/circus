import koa from 'koa';

declare module 'koa' {
  export interface Request {
    body?: any;
  }

  export interface ParametrizedContext<StateT = any, CustomT = {}> {
    user: any;
    userPrivileges: {
      globalPrivileges: string[];
    };
  }
}
