import type { CircusMiddleware } from '../typings/middlewares.ts';
import { httpError } from './errorHandler.ts';
import { contentType } from './validateInOut.ts';

export const typeCheck =
  (expectedType = 'application/json'): CircusMiddleware =>
  async (ctx, next) => {
    const body = ctx.var.jsonBody;
    if (
      /^(POST|PUT|PATCH)$/.test(ctx.req.method) &&
      !(Array.isArray(body) && body.length === 0)
    ) {
      const type = contentType(ctx);
      if (!type) throw httpError(400, 'Content-type is unspecified.');
      if (type !== expectedType) {
        throw httpError(
          415,
          'This content-type is unsupported. Expected ' + expectedType
        );
      }
    }
    await next();
  };
