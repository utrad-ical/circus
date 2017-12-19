/**
 * Creates a Koa middleware that checks request and response with schema.
 */
export default function validateInOut(validator, options = {}) {
	let {
		requestSchema,
		responseSchema
	} = options;

	if (requestSchema && typeof requestSchema === 'object') {
		requestSchema = { ...requestSchema, $async: true };
	}
	if (responseSchema && typeof responseSchema === 'object') {
		responseSchema = { ...responseSchema, $async: true };
	}

	return async function validateInOut(ctx, next) {
		if (requestSchema) {
			try {
				ctx.request.body = await validator.validate(
					requestSchema,
					ctx.request.body,
					'toDate'
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
					'fromDate'
				);
			} catch(err) {
				err.phase = 'response';
				throw err;
			}
		}
	};
}