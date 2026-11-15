import type { Validator } from '../interface.ts';
import type koa from 'koa';

interface Options {
  querySchema?: string;
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
  const { querySchema, requestSchema, responseSchema } = options;

  return async function validateInOut(ctx, next) {
    if (querySchema) {
      try {
        ctx.state.query = await validator.validate(
          querySchema,
          ctx.request.query,
          'toDate'
        );
      } catch (err: any) {
        err.phase = 'request';
        throw err;
      }
    }
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
