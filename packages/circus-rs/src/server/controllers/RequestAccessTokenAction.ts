import Controller from './Controller';
import * as express from 'express';
import { STATUS_CODES } from 'http';
import AuthorizationCache from '../AuthorizationCache';
import * as crypt from 'crypto';
import logger from '../Logger';
import { ValidatorRules } from '../../common/Validator';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export default class RequestAccessTokenAction extends Controller {
	public allowFrom: string;

	protected needsTokenAuthorization(): boolean {
		return false;
	}

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null]
		};
	}

	public execute(req: express.Request, res: express.Response): void {
		let ip = req.connection.remoteAddress;
		if (!ip.match(this.allowFrom)) {
			logger.info('401 error');
			res.writeHead(401, STATUS_CODES[401]);
			res.write(STATUS_CODES[401]);
			res.end();
			return;
		}
		super.execute(req, res);
	}

	protected process(query: any, req: express.Request, res: express.Response): void {
		let series: string = query.series;

		crypt.randomBytes(48, (err, buf) => {
			let status = {};

			if (err) {
				this.respondInternalServerError(
					res, 'Internal server error while generating token'
				);
			} else {
				let token: string = buf.toString('hex');
				req.app.locals.authorizationCache.update(series, token);
				status = {
					'result': 'ok',
					'token': token
				};
				this.respondJson(res, status);
			}
		});

	}

}
