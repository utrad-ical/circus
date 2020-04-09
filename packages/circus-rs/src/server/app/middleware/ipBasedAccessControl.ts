import koa from 'koa';
import httpStatus from 'http-status';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';

type MiddlewareOptions = {
  logger: Logger;
  allowPattern: string;
};

/**
 * Creates a koa middleware function that blocks unauthorized IP address
 */
export default function ipBasedAccessControl(
  options: MiddlewareOptions
): koa.Middleware {
  const { logger, allowPattern } = options;
  return async function(
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const req = ctx.request;
    const ip: string = req.ip;
    if (!ip.match(allowPattern)) {
      logger.warn(
        `Denied access from unauthorized IP: ${req.ip} for ${req.url}`
      );
      ctx.throw(httpStatus.UNAUTHORIZED, 'Access unauthorized');
    } else {
      await next();
    }
  };
}
