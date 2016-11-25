import * as express from 'express';
import Logger from '../loggers/Logger';

// This class is needed because TypeScript currently
// cannot properly directly extend native Error class.
// This CustomError is a workaround found here:
// https://github.com/Microsoft/TypeScript/issues/10166#issuecomment-244614940
// We may remove this by targeting at ES6.

class CustomError extends Error {
	constructor(message: string) {
		super();
		this.message = message;
	}
}

export class StatusError extends CustomError {
	public status: number;
	public stack: string | undefined;

	public static notFound(message: string): StatusError {
		return new StatusError(404, message);
	}

	public static badRequest(message: string): StatusError {
		return new StatusError(400, message);
	}

	public static internalServerError(message: string): StatusError {
		return new StatusError(500, message);
	}

	public static unauthorized(message: string): StatusError {
		return new StatusError(401, message);
	}

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

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
