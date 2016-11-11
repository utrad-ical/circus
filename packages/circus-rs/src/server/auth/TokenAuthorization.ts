import * as express from 'express';
import AuthorizationCache from './AuthorizationCache';

/**
 * Returns an Express middleware function that blocks unauthorized requests
 */
export function tokenAuthentication(authorizationCache: AuthorizationCache): express.Handler {
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {

		function invalid(): void {
			res.setHeader('WWW-Authenticate', 'Bearer realm="CircusRS"');
			res.status(401)
				.json({ status: 'ng', message: 'Access denied.' });
			res.end();
		}

		if (!('authorization' in req.headers)) {
			invalid();
			return;
		}

		const [ bearer, token ] = req.headers['authorization'].split(' ');

		if (bearer.toLowerCase() !== 'bearer') {
			invalid();
			return;
		}

		if (!authorizationCache.isValid(req.params.sid, token)) {
			invalid();
			return;
		}

		// authorized!
		next();
	};
}
