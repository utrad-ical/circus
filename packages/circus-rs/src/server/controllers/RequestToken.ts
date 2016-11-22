import Controller from './Controller';
import * as express from 'express';
import { ValidatorRules } from '../../common/Validator';
import { isUID } from '../../common/ValidatorRules';
import { generateAccessToken } from '../auth/GenerateToken';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export default class RequestToken extends Controller {
	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, isUID, null]
		};
	}

	protected process(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const series: string = req.query.series;

		generateAccessToken().then(token => {
			req.app.locals.authorizationCache.update(series, token);
			const status = { result: 'OK', token };
			res.json(status);
			res.end();
		}).catch(() => {
			next(this.createInternalServerError(
				'Internal server error occurred while generating access token'
			));
		});

	}

}
