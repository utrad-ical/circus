import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import { searchResult } from '../../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { pluginJob } from '../../../schemas/index.ts';

export const getAdminPluginJobQueue = defineRoute({
  verb: 'get',
  path: '/admin/plugin-job-queue',
  handler: handleGet,
  description: 'Returns plugin job queue.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResult(pluginJob)
});

export default defineRouteGroup({
  name: 'Plugin Job Queue Administration',
  description: 'Returns job queue.',
  routes: [getAdminPluginJobQueue]
});
