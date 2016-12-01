import * as express from 'express';
import { ServerHelpers } from '../../ServerHelpers';

export function countUp(helpers: ServerHelpers, key: string): express.RequestHandler {
	const { counter } = helpers;
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		counter.countUp(key);
		next();
	};
}
