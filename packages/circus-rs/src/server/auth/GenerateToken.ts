'use strict';

import * as crypt from 'crypto';

/**
 * Generate new random access token.
 * @returns {Promise<T>}
 */
export function generateAccessToken(): Promise<string> {
	return new Promise((resolve, reject) => {
		crypt.randomBytes(48, (err, buf) => {
			if (err) {
				reject(err);
			} else {
				resolve(buf.toString('hex'));
			}
		});
	});
}
