/**
 * Calculates the set of privileges of the specified user.
 */
export async function determineUserAccessInfo(models, user) {
	const globalPrivileges = {};
	const domains = {};
	const accessibleProjects = {};
	for (const groupId of user.groups) {
		const group = await models.group.findByIdOrFail(groupId);
		for (const priv of group.privileges) {
			globalPrivileges[priv] = true;
		}
		for (const domain of group.domains) {
			domains[domain] = true;
		}
		const roleNames = ['read', 'write', 'viewPersonalInfo', 'moderate', 'addSeries'];
		for (const role of roleNames) {
			for (const pId of group[`${role}Projects`]) {
				if (!(pId in accessibleProjects)) {
					accessibleProjects[pId] = {
						projectId: pId,
						roles: {}
					};
				}
				accessibleProjects[pId].roles[role] = true;
			}
		}
	}
	for (const p in accessibleProjects) {
		const project = await models.project.findByIdOrFail(p);
		accessibleProjects[p].project = project;
		accessibleProjects[p].roles = Object.keys(accessibleProjects[p].roles);
	}
	return {
		domains: Object.keys(domains),
		globalPrivileges: Object.keys(globalPrivileges),
		accessibleProjects: Object.values(accessibleProjects)
	};
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