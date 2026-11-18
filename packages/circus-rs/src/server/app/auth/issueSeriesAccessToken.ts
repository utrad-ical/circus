import type { Handler, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { RsEnv } from '../../types.ts';
import type { Logger } from '@utrad-ical/circus-lib';
import { isDicomUid } from '@utrad-ical/circus-lib';
import validate from '../middleware/validate.ts';
import ipBasedAccessControl from '../middleware/ipBasedAccessControl.ts';
import type { Authorizer } from '../../helper/createAuthorizer.ts';

type MiddlewareOptions = {
  rsLogger: Logger;
  authorizer: Authorizer;
  ipFilter?: string;
};

/**
 * Handles 'issueSeriesAccessToken' middleware (as route) which returns an access token
 * for each authorized series.
 */
export default function issueSeriesAccessToken(
  options: MiddlewareOptions
): [MiddlewareHandler<RsEnv>, ...MiddlewareHandler<RsEnv>[], Handler<RsEnv>] {
  const { rsLogger: logger, authorizer, ipFilter } = options;

  const validator = validate({
    series: ['Series UID', null, s => isDicomUid(s), null]
  });

  const main: Handler<RsEnv> = async ctx => {
    const series = ctx.req.query('series')!;

    try {
      const token = await authorizer.issueToken(series);
      return ctx.json({ result: 'OK', token });
    } catch (err) {
      throw new HTTPException(500, {
        message: 'Internal server error occurred while generating access token'
      });
    }
  };

  return ipFilter
    ? [
        ipBasedAccessControl({ rsLogger: logger, allowPattern: ipFilter }),
        validator,
        main
      ]
    : [validator, main];
}
