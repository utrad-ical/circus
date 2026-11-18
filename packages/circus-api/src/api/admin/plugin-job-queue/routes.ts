import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { searchResultOf } from '../../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { pluginJobDoc } from '@utrad-ical/circus-api-schema';

export const getQueue = defineRoute({
  verb: 'get',
  path: '/admin/plugin-job-queue',
  description: 'Returns plugin job queue.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResultOf(pluginJobDoc)
});

export default defineRouteGroup({
  name: 'Plugin Job Queue Administration',
  description: 'Returns job queue.',
  routes: [route(getQueue, handleGet)]
});
