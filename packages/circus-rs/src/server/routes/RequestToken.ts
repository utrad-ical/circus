import * as koa from 'koa';
import * as compose from 'koa-compose';
import { isUID } from '../../common/ValidatorRules';
import { generateAccessToken } from '../auth/GenerateToken';
import StatusError from './Error';
import validate from './middleware/Validate';
import { ServerHelpers } from '../ServerHelpers';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export default function requestToken(helpers: ServerHelpers): koa.Middleware {
  const { authorizationCache } = helpers;
  const validator = validate({ series: ['Series UID', null, isUID, null] });

  const main: koa.Middleware = async function requestToken(
    ctx,
    next
  ): Promise<void> {
    const series: string = ctx.request.query.series;

    try {
      const token = await generateAccessToken();
      authorizationCache.update(series, token);
      ctx.body = { result: 'OK', token };
    } catch (err) {
      throw StatusError.internalServerError(
        'Internal server error occurred while generating access token'
      );
    }
  };

  return compose([validator, main]);
}
