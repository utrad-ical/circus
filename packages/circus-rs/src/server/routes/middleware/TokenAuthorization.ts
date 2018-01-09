import * as koa from 'koa';
import StatusError from '../Error';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Returns a koa middleware function that blocks unauthorized requests
 */
export default function tokenAuthentication(
  helpers: ServerHelpers
): koa.Middleware {
  const { logger, authorizationCache } = helpers;

  return async function(ctx, next): Promise<void> {
    const { request: req, response: res } = ctx;

    function invalid(): void {
      ctx.response.set('WWW-Authenticate', 'Bearer realm="CircusRS"');
      throw StatusError.unauthorized('Access denied');
    }

    const authorization = req.headers.authorization;

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

    if (!authorizationCache.isValid(ctx.params.sid, token)) {
      logger.warn('Invalid access token.');
      invalid();
      return;
    }

    // authorized!
    await next();
  };
}
