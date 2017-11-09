import * as koa from 'koa';
import Logger from '../../loggers/Logger';

/**
 * Global error handler which always output errors in JSON format
 * @param logger Logger to inject
 */
export function errorHandler(logger: Logger): koa.Middleware {
	return async function(ctx: koa.Context, next) {
		try {
			await next();
		} catch (err) {
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
	
			ctx.status = status;
			ctx.body = out;
		}
	};
}
