import Controller from './Controller';
import * as express from 'express';
import { STATUS_CODES } from 'http';
import * as crypt from 'crypto';
import { ValidatorRules } from '../../common/Validator';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export default class RequestAccessTokenAction extends Controller {
	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null]
		};
	}

	public execute(req: express.Request, res: express.Response): void {
		const ip = req.connection.remoteAddress;
		if (!ip.match(req.app.locals.authorization.allowFrom)) {
			this.logger.warn('401 error');
			res.writeHead(401, STATUS_CODES[401]);
			res.write(STATUS_CODES[401]);
			res.end();
			return;
		}
		super.execute(req, res);
	}

	protected process(query: any, req: express.Request, res: express.Response): void {
		const series: string = query.series;

		crypt.randomBytes(48, (err, buf) => {
			if (err) {
				this.respondInternalServerError(
					res, 'Internal server error while generating token'
				);
			} else {
				const token: string = buf.toString('hex');
				req.app.locals.authorizationCache.update(series, token);
				const status = {
					'result': 'ok',
					'token': token
				};
				this.respondJson(res, status);
			}
		});

	}

}
