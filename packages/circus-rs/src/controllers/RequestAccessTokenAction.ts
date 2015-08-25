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
	private cache: AuthorizationCache;

	public setCache(cache: AuthorizationCache): void {
		this.cache = cache;
	}

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null]
		};
	}

	public process(query: any, res: http.ServerResponse): void {
		var series: string = query['series'];

		crypt.randomBytes(48, (ex, buf)=> {
			var status = {};

			if (ex) {
				status = {
					'result': 'ng'
				};
			} else {
				var token: string = buf.toString('hex');
				this.cache.update(series, token);
				status = {
					'result': 'ok',
					'token': token
				};
			}
			this.respondJson(res, status);
		});

	}

}
