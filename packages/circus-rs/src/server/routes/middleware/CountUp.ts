import * as express from 'express';
import { ServerHelpers } from '../../ServerHelpers';

export function countUp(helpers: ServerHelpers): express.RequestHandler {
	const { counter } = helpers;
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const key = req.path.split('/').slice(-1)[0];
		counter.countUp(key);
		next();
	};
}
