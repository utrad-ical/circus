import status from 'http-status';

export default function authGlobalPrivileges(privileges) {
	return async function authGlobalPrivileges(ctx, next) {
		if (privileges) { // TODO: implement check
			// check passed
			await next();
		} else {
			ctx.throw(
				status.UNAUTHORIZED,
				'You do not have the privilege to access this API.'
			);
		}
	};
}