import type koa from 'koa';
import compose from 'koa-compose';
import type { Logger } from '@utrad-ical/circus-lib';
import { isDicomUid } from '@utrad-ical/circus-lib';
import httpStatus from 'http-status';
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
): koa.Middleware {
  const { rsLogger: logger, authorizer, ipFilter } = options;

  const validator = validate({
    series: ['Series UID', null, s => isDicomUid(s), null]
  });

  const main: koa.Middleware = async function (
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const series: string = ctx.request.query.series;

    try {
      const token = await authorizer.issueToken(series);
      ctx.body = { result: 'OK', token };
    } catch (err) {
      ctx.throw(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Internal server error occurred while generating access token'
      );
    }
  };

  const middlewares = [validator, main];
  if (ipFilter) {
    middlewares.unshift(
      ipBasedAccessControl({ rsLogger: logger, allowPattern: ipFilter })
    );
  }

  return compose(middlewares);
}
