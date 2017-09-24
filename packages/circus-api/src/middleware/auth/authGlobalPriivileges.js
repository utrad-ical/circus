export default function authGlobalPriivileges(privileges) {
	return async function authGlobalPriivileges(ctx, next) {
		if (true) {
			// check passed
			next();
		} else {
			ctx.throw(401, 'You do not have the privilege to access this API');
		}
	};
}