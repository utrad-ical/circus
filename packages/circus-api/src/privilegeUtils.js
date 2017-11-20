/**
 * Calculates the set of global privileges of the specified user.
 * A user's global privileges are the sum of global privileges
 * which are granted via the groups which the user belongs to.
 */
export async function globalPrivilegesOfUser(models, user) {
	// Determines the list of privileges this user has
	const userPrivileges = {};
	for (const groupId of user.groups) {
		const group = await models.group.findByIdOrFail(groupId);
		for (const priv of group.privileges) {
			userPrivileges[priv] = true;
		}
	}
	return userPrivileges;
}


export async function accessibleProjectsForOperation(models, user, operation) {
	const operations = [
		'read', 'write', 'addSeries', 'viewPersonalInfo', 'moderate'
	];
	if (typeof operation !== 'string' || operations.indexOf(operation) < 0) {
		throw new TypeError('Unknown project operation type.');
	}

	const result = {};
	for (const groupId of user.groups) {
		const group = await models.group.findById(groupId);
		for (const projId of group[operation + 'Projects']) {
			result[projId] = true;
		}
	}
	return result;
}