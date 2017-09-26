import Ajv from 'ajv';

/**
 * Creates an error handler middleware that always outputs JSON
 * as a HTTP response regardless of the cause of the error.
 */
export default function errorHandler(debugMode) {
	return async function errorHandler(ctx, next) {
		try {
			await next();
			if (ctx.status === 404) {
				ctx.body = { error: 'Not found' };
				ctx.status = 404; // Reassign is necessary
			}
		} catch (err) {
			if (err instanceof Ajv.ValidationError) {
				// JSON validation error occurred.
				if (err.phase == 'response') {
					// Response validation error.
					// This means there is a bug on the server-side,
					// or the database is corrupted.
					ctx.status = 500;
					ctx.body = {
						error: 'Response schema validation error detected.'
					};
				} else {
					// Request validation error.
					// This just means the user has sent wrong data that does
					// not fulfill some JSON schema.
					ctx.status = 400;
					ctx.body = {
						error: 'Request data is not correct.',
						validationErrors: err.errors
					};
				}
				return;
			} else {
				// Other exceptions thrown.
				if (!err.status) {
					// Exception without `status` means some unexpected
					// run-time error happened outside of `ctx.throw()`.
					ctx.status = 500;
					if (debugMode) {
						ctx.body = { error: err.message, stack: err.stack };
					} else {
						ctx.body = { error: 'Internal server error.' };
					}
				} else {
					// Exception with `status` means `ctx.throw()` was
					// manually called somewhere in our codebase.
					// (We have successfully handled an exceptional event!)
					ctx.status = err.status;
					ctx.body = { error: err.message };
				}
			}
		}
	};
}
