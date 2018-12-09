import koa from 'koa';
import httpStatus from 'http-status';
import { Authorizer } from '../../helper/prepareHelperModules';
import Logger from '../../helper/logger/Logger';

type MiddlewareOptions = {
  logger: Logger;
  authorizer: Authorizer;
};

/**
 * Returns a koa middleware function that blocks unauthorized requests
 */
export default function checkSeriesAccessToken(
  options: MiddlewareOptions
): koa.Middleware {
  const { logger, authorizer } = options;

  return async function(ctx, next): Promise<void> {
    const { request } = ctx;

    function invalid(): void {
      ctx.response.set('WWW-Authenticate', 'Bearer realm="CircusRS"');
      ctx.throw(httpStatus.UNAUTHORIZED, 'Access denied');
    }

    const authorization = request.headers.authorization;

    if (!authorization || typeof authorization !== 'string') {
      logger.warn('Tried to access data without authorization header.');
      invalid();
      return;
    }

    const [bearer, token] = authorization.split(' ');

    if (typeof bearer !== 'string' || bearer.toLowerCase() !== 'bearer') {
      logger.warn('Invalid authorization header.');
      invalid();
      return;
    }

    if (!(await authorizer.checkToken(token, ctx.params.sid))) {
      logger.warn('Invalid access token.');
      invalid();
      return;
    }

    // authorized!
    await next();
  };
}
