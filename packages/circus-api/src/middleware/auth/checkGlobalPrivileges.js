import status from 'http-status';
import { globalPrivilegesOfUser } from '../../privilegeUtils';

/**
 * Return a middleware that checks user's global privilege.
 * @param {string|string[]} privileges
 */
export default function checkGlobalPrivileges({ models }, privileges) {

	if (typeof privileges === 'string') privileges = [privileges];
	else if (!Array.isArray(privileges)) {
		throw new TypeError('Invalid list of privileges');
	}

	return async function checkGlobalPrivileges(ctx, next) {
		const user = ctx.user;
		const globalPrivileges = await globalPrivilegesOfUser(models, user);
		for (const priv of privileges) {
			if (!globalPrivileges[priv]) {
				ctx.throw(
					status.UNAUTHORIZED,
					'You do not have a privilege to access this resource.'
				);
			}
		}
		await next();
	};
}