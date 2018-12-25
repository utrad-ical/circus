import Koa from 'koa';

/**
 * Simple middleware to append CORS response header.
 */
type CORSMethod = 'POST' | 'GET' | 'PUT' | 'OPTIONS' | 'PATCH' | 'DELETE';
type CORSHeader = 'Authorization' | 'Content-Type';
type CORSOptions = {
  origin?: string;
  methods?: CORSMethod[];
  headers?: CORSHeader[];
  maxAge?: number;
};

export default function cors(options: CORSOptions = {}): Koa.Middleware {
  const {
    origin = '*',
    methods = ['GET'],
    headers = ['Authorization'],
    maxAge = 86400
  } = options;
  return async (ctx, next) => {
    ctx.response.set('Access-Control-Allow-Origin', origin);
    ctx.response.set('Access-Control-Allow-Methods', methods.join(', '));
    ctx.response.set('Access-Control-Allow-Credentials', 'true');
    ctx.response.set('Access-Control-Allow-Headers', headers.join(', '));
    ctx.response.set('Access-Control-Max-Age', maxAge.toString());
    await next();
  };
}
