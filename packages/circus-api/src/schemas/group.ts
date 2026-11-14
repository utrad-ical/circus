import { z } from 'zod';
import { num } from './formats.ts';

const ids = (description: string) =>
  z.array(z.string()).optional().describe(description);

export const group = z.strictObject({
  groupId: num().optional().describe('Unique incremental group ID.'),
  groupName: z.string().optional(),
  privileges: z
    .array(
      z.enum([
        'createProject',
        'deleteProject',
        'manageServer',
        'personalInfoView',
        'downloadVolume',
        'issueOnetime'
      ])
    )
    .optional(),
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
  )
});
