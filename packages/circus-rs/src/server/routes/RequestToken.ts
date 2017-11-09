import * as koa from 'koa';
import * as compose from 'koa-compose';
import { isUID } from '../../common/ValidatorRules';
import { generateAccessToken } from '../auth/GenerateToken';
import { StatusError } from './Error';
import { validate } from './middleware/Validate';
import { ServerHelpers } from '../ServerHelpers';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export function execute(helpers: ServerHelpers): koa.Middleware {
	const { authorizationCache } = helpers;
	const validator = validate({ series: ['Series UID', null, isUID, null] });

	const main = async (ctx, next) => {
		const series: string = ctx.request.query.series;

		generateAccessToken().then(token => {
			authorizationCache.update(series, token);
			ctx.body = { result: 'OK', token };
		}).catch(() => {
			next(StatusError.internalServerError('Internal server error occurred while generating access token'));
		});
	};

	return compose([validator, main]);

}
