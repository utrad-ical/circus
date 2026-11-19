import type { z } from 'zod';
import {
  csRoleNames,
  dbRoleNames,
  type globalPrivilege
} from '@utrad-ical/circus-api-schema';

export { csRoleNames, dbRoleNames };
import * as mr from 'multi-integer-range';
import status from 'http-status';
import type { Models } from './interface.ts';
import { httpError } from './middleware/errorHandler.ts';
import type { SeriesEntry } from './typings/circus.ts';
import {
  isValidPartialVolumeDescriptor,
  partialVolumeDescriptorToArray
} from '@utrad-ical/circus-rs/server';

type DbRoleName = (typeof dbRoleNames)[number];

interface ProjectPrivilege {
  projectId: string;
  roles: DbRoleName[];
  project: any;
}

type CsRoleName = (typeof csRoleNames)[number];

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

export const assertSeriesDomainAccess = (
  userPrivileges: UserPrivilegeInfo,
  domain: string
) => {
  if (!userPrivileges.domains.includes(domain)) {
    throw httpError(status.FORBIDDEN, 'You cannot access this series.');
  }
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

  for (const seriesEntry of series) {
    const { seriesUid, partialVolumeDescriptor } = seriesEntry;
    const item = await models.series.findById(seriesUid, { withLock: true });
    if (!item) {
      throw httpError(status.BAD_REQUEST, 'Nonexistent series.');
    }
    assertSeriesDomainAccess(userPrivileges, item.domain);
    if (!isValidPartialVolumeDescriptor(partialVolumeDescriptor)) {
      throw httpError(status.BAD_REQUEST, 'Invalid image range.');
    }
    const partialImages = partialVolumeDescriptorToArray(
      partialVolumeDescriptor
    );
    if (
      partialImages.length === 0 ||
      !mr.has(mr.initialize(item.images), mr.normalize(partialImages))
    ) {
      throw httpError(status.BAD_REQUEST, 'Specified range is invalid.');
    }
    seriesData.push({ ...item, partialVolumeDescriptor });
  }

  return seriesData;
};

export const globalPrivileges = (): {
  privilege: z.output<typeof globalPrivilege>;
  caption: string;
}[] => [
  { privilege: 'createProject', caption: 'Create Project' },
  { privilege: 'deleteProject', caption: 'Delete Project' },
  { privilege: 'manageServer', caption: 'Manage Server' },
  { privilege: 'personalInfoView', caption: 'View Personal Info' },
  { privilege: 'downloadVolume', caption: 'Download Volume as Raw File' },
  { privilege: 'issueOnetime', caption: 'Issue Onetime URL' }
];
