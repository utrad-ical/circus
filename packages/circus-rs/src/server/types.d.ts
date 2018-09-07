import koa from 'koa';

declare module 'koa' {
  interface Context {}
}

// Augument Error class with status/expose
declare global {
  interface Error {
    status?: number;
    expose?: boolean;
  }
}
