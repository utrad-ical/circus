import { z } from 'zod';
import { dateField } from './formats.ts';

const ids = (description: string) => z.array(z.string()).describe(description);

/** The roles of a group in a project */
export const dbRoleNames = [
  'read',
  'write',
  'viewPersonalInfo',
  'moderate',
  'addSeries'
] as const;

/** The roles of a group for a plug-in */
export const csRoleNames = [
  'readPlugin',
  'executePlugin',
  'manageJobs',
  'inputPersonalFeedback',
  'inputConsensualFeedback',
  'manageFeedback',
  'viewPersonalInfo'
] as const;

export const globalPrivilege = z.enum([
  'createProject',
  'deleteProject',
  'manageServer',
  'personalInfoView',
  'downloadVolume',
  'issueOnetime'
]);

/** A group in the database */
export const groupDoc = z
  .strictObject({
    groupId: z.int().describe('Unique incremental group ID.'),
    groupName: z.string(),
    privileges: z.array(globalPrivilege),
    domains: ids('Domains that group members are allowed to access.'),
    readProjects: ids('Project IDs that members can read.'),
    writeProjects: ids('Project IDs that members can write.'),
    addSeriesProjects: ids('Project IDs where members can add series.'),
    viewPersonalInfoProjects: ids(
      'Project IDs where members can view personal information.'
    ),
    moderateProjects: ids('Project IDs that members can moderate.'),
    readPlugin: ids('Plug-in IDs that members can read.'),
    executePlugin: ids('Plug-in IDs that members can execute.'),
    manageJobs: ids('Plug-in IDs whose jobs members can manage.'),
    inputConsensualFeedback: ids(
      'Plug-in IDs where members can input consensual feedback.'
    ),
    inputPersonalFeedback: ids(
      'Plug-in IDs where members can input personal feedback.'
    ),
    manageFeedback: ids('Plug-in IDs whose feedback members can manage.'),
    viewPersonalInfo: ids(
      'Plug-in IDs where members can view personal information.'
    ),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents a user group.');

export const groupCreate = groupDoc.omit({
  groupId: true,
  createdAt: true,
  updatedAt: true
});

export const groupPatch = groupCreate.partial();
