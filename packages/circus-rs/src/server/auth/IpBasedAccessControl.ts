import * as express from 'express';
import { STATUS_CODES } from 'http';

/**
 * Creates an Express middleware function that blocks unauthorized IP address
 */
export function ipBasedAccessControl(allowPattern: string): express.Handler {
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const ip: string = req.ip;
		if (!ip.match(allowPattern)) {
			res.status(401).json({ result: 'ng', error: STATUS_CODES[401] });
			res.end();
			return;
		} else {
			next();
		}
	};
}
