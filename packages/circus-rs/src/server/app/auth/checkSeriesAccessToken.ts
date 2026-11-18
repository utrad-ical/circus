import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { RsEnv } from '../../types.ts';
import type { Authorizer } from '../../helper/createAuthorizer.ts';
import type { Logger } from '@utrad-ical/circus-lib';

type MiddlewareOptions = {
  logger: Logger;
  authorizer: Authorizer;
};

/**
 * Returns middleware that blocks unauthorized requests
 */
export default function checkSeriesAccessToken(
  options: MiddlewareOptions
): MiddlewareHandler<RsEnv> {
  const { logger, authorizer } = options;

  return async (ctx, next) => {
    function invalid(): never {
      ctx.header('WWW-Authenticate', 'Bearer realm="CircusRS"');
      throw new HTTPException(401, {
        message: 'Access denied'
      });
    }

    const authorization = ctx.req.header('Authorization');

    if (!authorization) {
      logger.warn('Tried to access data without authorization header.');
      invalid();
    }

    const [bearer, token] = authorization.split(' ');

    if (typeof bearer !== 'string' || bearer.toLowerCase() !== 'bearer') {
      logger.warn('Invalid authorization header.');
      invalid();
    }

    if (!(await authorizer.checkToken(token, ctx.req.param('sid')!))) {
      logger.warn('Invalid access token.');
      invalid();
    }

    // authorized!
    await next();
  };
}
