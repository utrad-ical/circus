import MultiRange from 'multi-integer-range';
import { Models } from './interface';
import { SeriesEntry } from './typings/circus';
import {
  isValidPartialVolumeDescriptor,
  partialVolumeDescriptorToArray
} from '@utrad-ical/circus-lib';

const dbRoleNames = [
  'read',
  'write',
  'viewPersonalInfo',
  'moderate',
  'addSeries'
] as const;
type DbRoleName = typeof dbRoleNames[number];

interface ProjectPrivilege {
  projectId: string;
  roles: DbRoleName[];
  project: any;
}

const csRoleNames = [
  'readPlugin',
  'executePlugin',
  'manageJobs',
  'inputPersonalFeedback',
  'inputConsensualFeedback',
  'manageFeedback',
  'viewPersonalInfo'
] as const;
type CsRoleName = typeof csRoleNames[number];

interface PluginPrivilege {
  pluginId: string;
  roles: CsRoleName[];
  plugin: any;
}

export interface UserPrivilegeInfo {
  domains: string[];
  globalPrivileges: string[];
  accessibleProjects: ProjectPrivilege[];
  accessiblePlugins: PluginPrivilege[];
}

/**
 * Calculates the set of privileges of the specified user.
 */
export const determineUserAccessInfo = async (models: Models, user: any) => {
  const globalPrivileges: { [priv: string]: boolean } = {};
  const domains: { [domain: string]: boolean } = {};
  const accessibleProjects: { [projectId: string]: ProjectPrivilege } = {};
  const accessiblePlugins: { [pluginId: string]: PluginPrivilege } = {};
  for (const groupId of user.groups) {
    const group = await models.group.findByIdOrFail(groupId);
    for (const priv of group.privileges) {
      globalPrivileges[priv] = true;
    }
    for (const domain of group.domains) {
      domains[domain] = true;
    }
    for (const role of dbRoleNames) {
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
    for (const role of csRoleNames) {
      for (const pId of group[`${role}`]) {
        if (!(pId in accessiblePlugins)) {
          accessiblePlugins[pId] = {
            pluginId: pId,
            roles: [],
            plugin: null
          };
        }
        if (accessiblePlugins[pId].roles.indexOf(role) < 0) {
          accessiblePlugins[pId].roles.push(role);
        }
      }
    }
  }
  for (const p in accessibleProjects) {
    const project = await models.project.findByIdOrFail(p);
    accessibleProjects[p].project = project;
  }
  for (const p in accessiblePlugins) {
    const plugin = await models.plugin.findByIdOrFail(p);
    accessiblePlugins[p].plugin = plugin;
  }
  return {
    domains: Object.keys(domains),
    globalPrivileges: Object.keys(globalPrivileges),
    accessibleProjects: Object.values(accessibleProjects),
    accessiblePlugins: Object.values(accessiblePlugins)
  } as UserPrivilegeInfo;
};

/**
 * Check domain and image range for each series.
 * Each series will be locked so that the relevant series will no be
 * accidentally deleted.
 * @param models Session-enabled Models object
 */
export const fetchAndLockAccessibleSeries = async (
  models: Models, // must be session-enabled
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
    const item = await models.series.findById(seriesUid, { withLock: true });
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
    const partialImages = partialVolumeDescriptorToArray(
      partialVolumeDescriptor
    );
    if (
      partialImages.length === 0 ||
      !new MultiRange(item.images).has(partialImages)
    ) {
      throwError(400, 'Specified range is invalid.');
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
  { privilege: 'personalInfoView', caption: 'View Personal Info' },
  { privilege: 'downloadVolume', caption: 'Download Volume as Raw File' },
  { privilege: 'issueOnetime', caption: 'Issue Onetime URL' }
];
