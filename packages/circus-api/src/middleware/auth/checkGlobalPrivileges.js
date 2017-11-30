import status from 'http-status';
import { determineUserAccessInfo } from '../../privilegeUtils';

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
		const { globalPrivileges } = await determineUserAccessInfo(models, user);
		const okay = privileges.every(p => globalPrivileges.some(pp => pp === p));
		if (!okay) {
			ctx.throw(
				status.UNAUTHORIZED,
				'You do not have sufficient privilege to access this resource.'
			);
		}
		await next();
	};
}