import koa from 'koa';

/**
 * Simple middleware to append CORS response header.
 */
const cors: (origin: string) => koa.Middleware = (origin = '*') => {
  return async function cors(ctx, next) {
    ctx.response.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS, PATCH, DELETE',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    await next();
  };
};

export default cors;
