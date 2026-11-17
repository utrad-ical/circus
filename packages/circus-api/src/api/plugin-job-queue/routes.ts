import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { searchResultOf } from '../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { pluginJobDoc } from '../../schemas/index.ts';

export const getQueue = defineRoute({
  verb: 'get',
  path: '/plugin-job-queue',
  description: 'Returns plugin job queue.',
  response: searchResultOf(pluginJobDoc)
});

export default defineRouteGroup({
  name: 'Plugin Job Queue',
  description: 'Returns job queue for the job started by the current user.',
  routes: [route(getQueue, handleGet)]
});
