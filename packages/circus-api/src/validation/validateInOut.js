/**
 * Creates a Koa middleware that checks request and response with schema.
 */
export default function validateInOut(validator, requestSchema, responseSchema) {
	return async function validateInOut(ctx, next) {
		if (requestSchema) {
			await validator.validate(requestSchema, ctx.request.body);
		}
		await next();
		if (responseSchema) {
			try {
				await validator.validate(responseSchema, ctx.body);
			} catch(err) {
				err.phase = 'response';
				throw err;
			}
		}
	};
}