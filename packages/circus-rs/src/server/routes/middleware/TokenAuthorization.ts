import * as express from 'express';
import { StatusError } from '../Error';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Returns an Express middleware function that blocks unauthorized requests
 */
export function tokenAuthentication(helpers: ServerHelpers): express.Handler {
	const { logger, authorizationCache } = helpers;

	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {

		function invalid(): void {
			res.setHeader('WWW-Authenticate', 'Bearer realm="CircusRS"');
			next(StatusError.unauthorized('Access denied'));
		}

		if (!('authorization' in req.headers)) {
			logger.warn('Tried to access data without authorization header.');
			invalid();
			return;
		}

		const [bearer, token] = req.headers['authorization'].split(' ');

		if (bearer.toLowerCase() !== 'bearer') {
			logger.warn('Invalid authorization header.');
			invalid();
			return;
		}

		if (!authorizationCache.isValid(req.params.sid, token)) {
			logger.warn('Invalid access token.');
			invalid();
			return;
		}

		// authorized!
		next();
	};
}
