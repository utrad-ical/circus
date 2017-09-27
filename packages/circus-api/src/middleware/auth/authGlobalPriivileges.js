export default function authGlobalPriivileges(privileges) {
	return async function authGlobalPriivileges(ctx, next) {
		if (privileges) { // TODO: implement check
			// check passed
			await next();
		} else {
			ctx.throw(401, 'You do not have the privilege to access this API');
		}
	};
}