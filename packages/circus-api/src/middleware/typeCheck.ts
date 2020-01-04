import status from 'http-status';
import { Middleware } from 'koa';

const typeCheck: (expectedType?: string) => Middleware = (
  expectedType = 'application/json'
) => {
  return async function typeCheck(ctx, next) {
    if (
      !/^(POST|PUT|PATCH)$/.test(ctx.request.method) ||
      ctx.request.body.length === 0
    ) {
      await next();
      return;
    }

    if (typeof ctx.request.type !== 'string' || ctx.request.type.length === 0) {
      ctx.throw(status.BAD_REQUEST, 'Content-type is unspecified.');
      return;
    }

    const contentType = /^([^;]*)/.exec(ctx.request.type)![1];
    if (contentType !== expectedType) {
      ctx.throw(
        status.UNSUPPORTED_MEDIA_TYPE,
        'This content-type is unsupported. Expected ' + expectedType
      );
      return;
    }
    await next();
  };
};

export default typeCheck;
