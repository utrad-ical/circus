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
export async function fetchAccessibleSeries(models, userPrivileges, series) {
  const seriesData = [];

  for (const seriesEntry of series) {
    const { seriesUid, partialVolumeDescriptor } = seriesEntry;
    const item = await models.series.findById(seriesUid);
    if (!item) {
      throw new Error('Nonexistent series.');
    }
    if (partialVolumeDescriptor) {
      const { start, end, delta = 1 } = partialVolumeDescriptor;
      if (start != end) {
        if (delta === 0) throw new Error('Specified range is invalid.');
        const partialImages = [];
        for (let i = start; i <= end; i += delta) {
          partialImages.push(i);
        }
        if (
          partialImages.length === 0 ||
          !new MultiRange(item.images).has(partialImages)
        ) {
          throw new Error('Specified range is invalid.');
        }
      }
      item.partialVolumeDescriptor = { start, end, delta };
    }

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
