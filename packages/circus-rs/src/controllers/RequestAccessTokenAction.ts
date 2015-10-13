/**
 * Register access token.
 *
 * series: DICOM series instance UID
 * token: access token
 *
 * also in metadata/mpr/oblique... request.
 */
import Controller from './Controller';
import http = require('http');
import AuthorizationCache from '../AuthorizationCache';
var crypt = require('crypto');
import logger from '../Logger';
import { ValidatorRules } from '../Validator';

export default class RequestAccessTokenAction extends Controller {
	public cache: AuthorizationCache;
	public allowFrom: string;

	protected needsTokenAuthorization(): boolean {
		return false;
	}

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null]
		};
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void {
		var ip = req.connection.remoteAddress;
		// logger.info(ip);
		if (!ip.match(this.allowFrom)) {
			logger.info('401 error');
			res.writeHead(401, http.STATUS_CODES[401]);
			res.write(http.STATUS_CODES[401]);
			res.end();
			return;
		}
		super.execute(req, res);
	}

	protected process(query: any, res: http.ServerResponse): void {
		var series: string = query['series'];

		crypt.randomBytes(48, (err, buf)=> {
			var status = {};

			if (err) {
				this.respondInternalServerError(
					res, 'Internal server error while genarating token'
				);
			} else {
				var token: string = buf.toString('hex');
				this.cache.update(series, token);
				status = {
					'result': 'ok',
					'token': token
				};
				this.respondJson(res, status);
			}
		});

	}

}
