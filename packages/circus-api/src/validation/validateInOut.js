/**
 * Creates a Koa middleware that checks request and response schema.
 */
export default function validateInOut(validator, requestSchema, responseSchema) {
	return async function validateInOut(ctx, next) {
		if (requestSchema) {
			// TODO: Return list of errors
			if (!validator.validate(requestSchema, ctx.request.body)) {
				ctx.throw(401, 'Input model validation error ' + validator.errorsText(validator.errors));
			}
		}
		await next();
		if (responseSchema) {
			if (!validator.validate(responseSchema, ctx.body)) {
				// The main route middleware tried to return invalid data.
				// This is due to a malformed data or a bug: this should never happen!
				ctx.throw(500, 'Response modal validation failure ' + validator.errorsText(validator.errors));
			}
		}
	};
}