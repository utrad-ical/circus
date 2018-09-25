import MultiRange from 'multi-integer-range';

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
    const roleNames = [
      'read',
      'write',
      'viewPersonalInfo',
      'moderate',
      'addSeries'
    ];
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

/**
 * Check domain and image range for each series.
 */
export async function fetchAccessibleSeries(
  models,
  userPrivileges,
  seriesUids
) {
  const seriesData = [];

  for (const seriesEntry of seriesUids) {
    const seriesUid = seriesEntry.seriesUid;
    const item = await models.series.findById(seriesUid);
    if (!item) {
      throw new Error('Nonexistent series.');
    }
    if (!new MultiRange(item.images).has(seriesEntry.range)) {
      throw new Error('Specified range is invalid.');
    }

    item.range = seriesEntry.range;
    seriesData.push(item);
    if (userPrivileges.domains.indexOf(item.domain) < 0) {
      throw new Error('You cannot access this series.');
    }
  }

  return seriesData;
}

export function globalPrivileges() {
  return [
    { privilege: 'createProject', caption: 'Create Project' },
    { privilege: 'deleteProject', caption: 'Delete Project' },
    { privilege: 'manageServer', caption: 'Manage Server' },
    { privilege: 'personalInfoView', caption: 'View Personal Info' }
  ];
}
