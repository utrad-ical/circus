import koa from 'koa';
import httpStatus from 'http-status';
import { Logger } from '@utrad-ical/circus-lib';

type MiddlewareOptions = {
  rsLogger: Logger;
  allowPattern: string;
};

/**
 * Creates a koa middleware function that blocks unauthorized IP address
 */
export default function ipBasedAccessControl(
  options: MiddlewareOptions
): koa.Middleware {
  const { rsLogger, allowPattern } = options;
  return async (ctx, next) => {
    const req = ctx.request;
    const ip: string = req.ip;
    if (!ip.match(allowPattern)) {
      rsLogger.warn(
        `Denied access from unauthorized IP: ${req.ip} for ${req.url}`
      );
      ctx.throw(httpStatus.UNAUTHORIZED, 'Access unauthorized');
    } else {
      await next();
    }
  };
}
