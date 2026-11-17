import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { handleGet, handlePut } from './index.ts';
import { pluginJobManager } from '../../../schemas/index.ts';

export const getPluginJobManager = defineRoute({
  verb: 'get',
  path: '/admin/plugin-job-manager',
  description: 'Gets the status of the job manager.',
  response: pluginJobManager
});

export const switchPluginJobManager = defineRoute({
  verb: 'put',
  path: '/admin/plugin-job-manager/switch',
  description: 'Sets the status of the job manager.',
  request: pluginJobManager,
  response: pluginJobManager
});

export default defineRouteGroup({
  name: 'Plugin Job Manager Administration',
  description: 'Manages CIRCUS CS Plug-in Job Manager.',
  routes: [
    route(getPluginJobManager, handleGet),
    route(switchPluginJobManager, handlePut)
  ]
});
