import { getConnInfo } from '@hono/node-server/conninfo';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { RsEnv } from '../../types.ts';
import type { Logger } from '@utrad-ical/circus-lib';

type MiddlewareOptions = {
  rsLogger: Logger;
  allowPattern: string;
  plainText?: boolean;
};

/**
 * Creates middleware that blocks unauthorized IP address
 */
export default function ipBasedAccessControl(
  options: MiddlewareOptions
): MiddlewareHandler<RsEnv> {
  const { rsLogger, allowPattern, plainText } = options;
  return async (ctx, next) => {
    const ip = getConnInfo(ctx).remote.address ?? '';
    if (!ip.match(allowPattern)) {
      rsLogger.warn(
        `Denied access from unauthorized IP: ${ip} for ${ctx.req.path}`
      );
      if (plainText) return ctx.text('Access unauthorized', 401);
      throw new HTTPException(401, {
        message: 'Access unauthorized'
      });
    }
    await next();
  };
}
