import Ajv from 'ajv';
import status from 'http-status';
import koa from 'koa';

interface Options {
  includeErrorDetails: boolean;
  logger: any;
}

/**
 * Creates an error handler middleware that always outputs JSON
 * as a HTTP response regardless of the cause of the error.
 */
const errorHandler: (options: Options) => koa.Middleware = ({
  includeErrorDetails = false,
  logger
}) => {
  return async function errorHandler(ctx, next) {
    try {
      logger.trace('Request', ctx.request.method, ctx.request.path);
      await next();
      if (ctx.status === status.NOT_FOUND) {
        ctx.throw(status.NOT_FOUND, 'Not found');
      }
    } catch (err: unknown) {
      logger.trace(err);
      if (err instanceof Ajv.ValidationError) {
        // JSON validation error occurred.
        if (err.phase === 'response') {
          // Response validation error.
          // This means there is a bug on the server-side,
          // or the database is corrupted.
          ctx.status = status.INTERNAL_SERVER_ERROR;
          ctx.body = {
            error: 'Response schema validation error detected.'
          };
        } else if (err.phase === 'request') {
          // Request validation error.
          // This just means the user has sent wrong data that does
          // not fulfill some JSON schema.
          ctx.status = status.BAD_REQUEST;
          ctx.body = {
            error: 'Request data is not correct.',
            validationErrors: err.errors
          };
        } else {
          ctx.status = status.INTERNAL_SERVER_ERROR;
          ctx.body = {
            error: 'Unexpected validation error.'
          };
        }
        return;
      } else {
        // Other exceptions thrown.
        const error = err as {
          status?: number;
          message?: string;
          stack?: string;
        };
        if (!error.status) {
          // Exception without `status` means some unexpected
          // run-time error happened outside of `ctx.throw()`.
          logger.error(error);
          ctx.status = status.INTERNAL_SERVER_ERROR;
          if (includeErrorDetails) {
            ctx.body = { error: error.message, stack: error.stack };
          } else {
            ctx.body = { error: 'Internal server error.' };
          }
        } else {
          // Exception with `status` means `ctx.throw()` was
          // manually called somewhere in our codebase.
          // (We have successfully handled an exceptional event!)
          logger.info('HTTP error with status ' + error.status);
          logger.info(error);
          ctx.status = error.status;
          ctx.body = { error: error.message };
        }
      }
    }
  };
};

export default errorHandler;
