import * as koa from 'koa';
import StatusError from '../Error';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Creates a koa middleware function that blocks unauthorized IP address
 */
export default function ipBasedAccessControl(
  helpers: ServerHelpers,
  allowPattern: string
): koa.Middleware {
  return async function(ctx, next): Promise<void> {
    const req = ctx.request;
    const ip: string = req.ip;
    if (!ip.match(allowPattern)) {
      helpers.logger.warn(
        `Denied access from unauthorized IP: ${req.ip} for ${req.url}`
      );
      throw StatusError.unauthorized('Access unauthorized');
    } else {
      await next();
    }
  };
}
