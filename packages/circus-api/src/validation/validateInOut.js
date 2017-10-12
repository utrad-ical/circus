/**
 * Creates a Koa middleware that checks request and response with schema.
 */
export default function validateInOut(validator, options = {}) {
	const {
		requestSchema,
		requestValidationOptions = {},
		responseSchema,
		responseValidationOptions = {}
	} = options;
	return async function validateInOut(ctx, next) {
		if (requestSchema) {
			try {
				ctx.request.body = await validator.validate(
					requestSchema,
					ctx.request.body,
					{ toDate: true, ...requestValidationOptions }
				);
			} catch(err) {
				err.phase = 'request';
				throw err;
			}
		}
		await next();
		if (responseSchema) {
			try {
				ctx.body = await validator.validate(
					responseSchema,
					ctx.body,
					{ fromDate: true, ...responseValidationOptions }
				);
			} catch(err) {
				err.phase = 'response';
				throw err;
			}
		}
	};
}