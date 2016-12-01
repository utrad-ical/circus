import * as express from 'express';
import Logger from '../../loggers/Logger';

/**
 * Global error handler which always output errors in JSON format
 * @param logger Logger to inject
 */
export function errorHandler(logger: Logger): express.ErrorRequestHandler {
	return function(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
		logger.error(err.message);
		if ('stack' in err) logger.trace(err.stack);

		// Unexpected error, probably due to bugs
		let status = 500;
		let message = 'Internal server error.';

		// Exceptions with status code, probably doe to invalid request, etc.
		if (typeof err.status === 'number') {
			status = err.status;
			message = err.message;
		}

		const out: any = { status: 'ng', message };
		if (process.env.NODE_ENV !== 'production' && 'stack' in err) {
			out.stack = err.stack;
		}

		res.status(status);
		res.json(out);
	};
}
