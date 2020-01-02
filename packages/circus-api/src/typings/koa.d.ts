import koa from 'koa';

declare module 'koa' {
  export interface Request {
    body: any;
  }

  export interface Context {
    user: any;
    userPrivileges: {
      globalPrivileges: string[];
    };
  }
}
