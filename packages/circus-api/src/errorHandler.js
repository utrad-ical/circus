// The JSON error handler middleware that always outputs some JSON string
const errorHandler = () => {
	return async function errorHandler(ctx, next) {
		try {
			await next();
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