import status from 'http-status';

/**
 * Return a middleware that checks user's global privilege.
 * @param {string|string[]} privileges
 */
export default function authGlobalPrivileges(privileges) {

	if (typeof privileges === 'string') privileges = [privileges];
	else if (!Array.isArray(privileges)) {
		throw new TypeError('Invalid list of privileges');
	}

	return async function authGlobalPrivileges(ctx, next) {
		const user = ctx.user;

		// Determines the list of privileges this user has
		const myPrivileges = {};
		for (const groupId of user.groups) {
			const group = await ctx.models.group.findByIdOrFail(groupId);
			for (const priv of group.privileges) {
				myPrivileges[priv] = true;
			}
		}

		// Check
		for (const priv of privileges) {
			if (!myPrivileges[priv]) {
				ctx.throw(
					status.UNAUTHORIZED,
					'You do not have a privilege to access this resource.'
				);
			}
		}

		// Passed!
		await next();
	};
}