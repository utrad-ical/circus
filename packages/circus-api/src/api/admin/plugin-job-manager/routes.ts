import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import { handleGet, handlePut } from './index.ts';
import { pluginJobManager } from '../../../schemas/index.ts';

export const getAdminPluginJobManager = defineRoute({
  verb: 'get',
  path: '/admin/plugin-job-manager',
  handler: handleGet,
  description: 'Gets the status of the job manager.',
  response: pluginJobManager
});

export const putAdminPluginJobManagerSwitch = defineRoute({
  verb: 'put',
  path: '/admin/plugin-job-manager/switch',
  handler: handlePut,
  description: 'Sets the status of the job manager.',
  request: pluginJobManager,
  response: pluginJobManager
});

export default defineRouteGroup({
  name: 'Plugin Job Manager Administration',
  description: 'Manages CIRCUS CS Plug-in Job Manager.',
  routes: [getAdminPluginJobManager, putAdminPluginJobManagerSwitch]
});
