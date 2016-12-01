import * as express from 'express';
import { isUID } from '../../common/ValidatorRules';
import { generateAccessToken } from '../auth/GenerateToken';
import { StatusError } from './Error';
import { validate } from './middleware/Validate';
import { ServerHelpers } from '../ServerHelpers';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export function execute(helpers: ServerHelpers): express.RequestHandler[] {
	const { authorizationCache } = helpers;
	const validator = validate({ series: ['Series UID', null, isUID, null] });

	const main = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
		const series: string = req.query.series;

		generateAccessToken().then(token => {
			authorizationCache.update(series, token);
			res.json({ result: 'OK', token });
		}).catch(() => {
			next(StatusError.internalServerError('Internal server error occurred while generating access token'));
		});

	};

	return [validator, main];

}
