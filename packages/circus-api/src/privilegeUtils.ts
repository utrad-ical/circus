import MultiRange from 'multi-integer-range';
import { Models } from './interface';
import { SeriesEntry } from './typings/circus';
import { isValidPartialVolumeDescriptor } from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

interface ProjectPrivilege {
  projectId: string;
  roles: string[];
  project: any;
}

export interface UserPrivilegeInfo {
  domains: string[];
  globalPrivileges: string[];
  accessibleProjects: ProjectPrivilege[];
}

/**
 * Calculates the set of privileges of the specified user.
 */
export const determineUserAccessInfo = async (models: Models, user: any) => {
  const globalPrivileges: { [priv: string]: boolean } = {};
  const domains: { [domain: string]: boolean } = {};
  const accessibleProjects: { [projectId: string]: ProjectPrivilege } = {};
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
            roles: [],
            project: null
          };
        }
        if (accessibleProjects[pId].roles.indexOf(role) < 0) {
          accessibleProjects[pId].roles.push(role);
        }
      }
    }
  }
  for (const p in accessibleProjects) {
    const project = await models.project.findByIdOrFail(p);
    accessibleProjects[p].project = project;
  }
  return {
    domains: Object.keys(domains),
    globalPrivileges: Object.keys(globalPrivileges),
    accessibleProjects: Object.values(accessibleProjects)
  } as UserPrivilegeInfo;
};

/**
 * Check domain and image range for each series.
 */
export const fetchAccessibleSeries = async (
  models: Models,
  userPrivileges: UserPrivilegeInfo,
  series: SeriesEntry[]
) => {
  const seriesData: any[] = [];

  const throwError = (statusCode: number, message: string) => {
    const err = new Error(message);
    err.expose = true;
    err.status = statusCode;
    throw err;
  };

  for (const seriesEntry of series) {
    const { seriesUid, partialVolumeDescriptor } = seriesEntry;
    const item = await models.series.findById(seriesUid);
    if (!item) {
      throwError(400, 'Nonexistent series.');
    }
    if (!isValidPartialVolumeDescriptor(partialVolumeDescriptor)) {
      throwError(
        400,
        'Invalid partial volume descriptor: ' +
          JSON.stringify(partialVolumeDescriptor)
      );
    }
    const { start, end, delta } = partialVolumeDescriptor;
    if (start != end) {
      if (delta === 0) throwError(400, 'Specified range is invalid.');
      const partialImages = [];
      for (let i = start; i <= end; i += delta) {
        partialImages.push(i);
      }
      if (
        partialImages.length === 0 ||
        !new MultiRange(item.images).has(partialImages)
      ) {
        throwError(400, 'Specified range is invalid.');
      }
    }
    seriesData.push({ ...item, partialVolumeDescriptor });
    if (userPrivileges.domains.indexOf(item.domain) < 0) {
      throw new Error('You cannot access this series.');
    }
  }

  return seriesData;
};

export const globalPrivileges = () => [
  { privilege: 'createProject', caption: 'Create Project' },
  { privilege: 'deleteProject', caption: 'Delete Project' },
  { privilege: 'manageServer', caption: 'Manage Server' },
  { privilege: 'personalInfoView', caption: 'View Personal Info' }
];
