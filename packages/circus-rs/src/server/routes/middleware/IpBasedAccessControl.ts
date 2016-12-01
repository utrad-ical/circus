import * as express from 'express';
import { StatusError } from '../Error';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Creates an Express middleware function that blocks unauthorized IP address
 */
export function ipBasedAccessControl(helpers: ServerHelpers, allowPattern: string): express.Handler {
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const ip: string = req.ip;
		if (!ip.match(allowPattern)) {
			helpers.logger.warn(`Denied access from unauthorized IP: ${req.ip} for ${req.url}`);
			next(StatusError.unauthorized('Access unauthorized'));
			return;
		} else {
			next();
		}
	};
}
