import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { searchResult } from '../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { pluginJob } from '../../schemas/index.ts';

export const getPluginJobQueue = defineRoute({
  verb: 'get',
  path: '/plugin-job-queue',
  handler: handleGet,
  description: 'Returns plugin job queue.',
  response: searchResult(pluginJob)
});

export default defineRouteGroup({
  name: 'Plugin Job Queue',
  description: 'Returns job queue for the job started by the current user.',
  routes: [getPluginJobQueue]
});
