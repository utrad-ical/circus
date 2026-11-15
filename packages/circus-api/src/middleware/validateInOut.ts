import type { Validator } from '../interface.ts';
import type koa from 'koa';

interface Options {
  requestSchema?: string;
  responseSchema?: string;
}

/**
 * Creates a Koa middleware that checks request and response with schema.
 */
const validateInOut: (
  validator: Validator,
  options?: Options
) => koa.Middleware = (validator, options = {}) => {
  const { requestSchema, responseSchema } = options;

  return async function validateInOut(ctx, next) {
    if (requestSchema) {
      try {
        ctx.request.body = await validator.validate(
          requestSchema,
          ctx.request.body,
          'toDate'
        );
      } catch (err: any) {
        err.phase = 'request';
        throw err;
      }
    }
    await next();
    if (responseSchema) {
      try {
        ctx.body = await validator.validate(
          responseSchema,
          ctx.body,
          'fromDate'
        );
      } catch (err: any) {
        err.phase = 'response';
        throw err;
      }
    }
  };
};

export default validateInOut;
