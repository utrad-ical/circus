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

declare module 'http' {
  interface IncomingMessage {
    // koa-multer adds files here
    // https://github.com/expressjs/multer
    files: {
      encoding: string;
      mimetype: string;
      size: number;
      originalname: string;
      buffer: Buffer;
    }[];
  }
}
