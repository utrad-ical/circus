import * as express from 'express';
import * as url from 'url';

interface AuthorizationInfo {
	[token: string]: Date;
}

export default class AuthorizationCache {
	private config: any;
	private cache: AuthorizationInfo = {};

	constructor(config: any) {
		this.config = config || {};

		setInterval(
			() => {
				let date: Date = new Date();

				for (let x in this.cache) {
					let limit: Date = this.cache[x];
					if (limit.getTime() <= date.getTime()) {
						delete this.cache[x];
					}
				}
			},
			3600 * 1000
		);

	}

	/**
	 * update token lifetime.
	 *
	 * @param series DICOM series instance UID
	 * @param token any strings to identify client.
	 */
	public update(series: string, token: string): void {
		let currentDate: Date = new Date();
		currentDate.setTime(currentDate.getTime() + this.config.expire * 1000);
		this.cache[token + '_' + series] = currentDate;
	}

	/**
	 * validate query string if access is allowed.
	 *
	 * @param req HTTP request. 'series' query parameter and X-CircusRs-AccessToken http header needed.
	 * @returns {boolean}
	 */
	public isValid(req: express.Request): boolean {
		let query = url.parse(req.url, true).query;
		let token: string;
		let series: string;

		if ('series' in query) {
			series = query.series;
		}

		if ('authorization' in req.headers) {
			token = req.headers['authorization'];
			let t = token.split(' ');
			if (t[0].toLowerCase() !== 'bearer') {
				return false;
			}
			token = t[1];
		} else {
			// logger.warn('Authorization http header.');
		}
		if (series == null || token == null) {
			// logger.debug('series or token is null');
			return false;
		}

		let key: string = token + '_' + series;
		let current: Date = new Date();
		let date: Date = this.cache[key];

		if (date == null) {
			// logger.debug('token not found');
			return false;
		}

		if (current.getTime() <= date.getTime()) {
			this.update(series, token);
			return true;
		}
		// logger.debug('token expired');
		delete this.cache[key];
		return false;
	}

}
