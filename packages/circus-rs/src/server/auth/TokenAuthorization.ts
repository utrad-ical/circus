import * as express from 'express';
import { STATUS_CODES } from 'http';
import AuthorizationCache from './AuthorizationCache';

/**
 * Returns an Express middleware function that blocks unauthorized requests
 */
export function tokenAuthentication(authorizationCache: AuthorizationCache): express.Handler {
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		if (!authorizationCache.isValid(req)) {
			res.setHeader('WWW-Authenticate', 'Bearer realm="CircusRS"');
			res.writeHead(401, STATUS_CODES[401]);
			res.write('Access denied.');
			res.end();
			return;
		} else {
			next();
		}
	};
}
