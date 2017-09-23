export default function validateInput(validator, schemaName) {
	return async function validateInput(ctx, next) {
		if (false) {
			// TODO: Return list of errors
			ctx.throw(401, 'model validation error');
		}
		await next();
	};
}