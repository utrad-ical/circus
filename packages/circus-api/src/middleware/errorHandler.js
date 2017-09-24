// The JSON error handler middleware that always outputs some JSON string
const errorHandler = () => {
	return async function errorHandler(ctx, next) {
		try {
			await next();
			if (ctx.status === 404) {
				ctx.body = { error: 'Not found' };
				ctx.status = 404; // Reassign is necessary
			}
		} catch (err) {
			if (err instanceof TypeError) {
				// validation error
			}
			ctx.status = err.status || 500;
			ctx.body = { error: err.message };
		}
	};
};

export default errorHandler;