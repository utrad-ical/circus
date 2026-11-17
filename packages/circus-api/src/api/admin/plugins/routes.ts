import { z } from 'zod';
import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import { searchResultOf, withDates } from '../../../schemas/derive.ts';
import { handlePatch, handlePost, handleSearch } from './index.ts';
import { plugin, remotePlugin } from '../../../schemas/index.ts';

export const getAdminPlugins = defineRoute({
  verb: 'get',
  path: '/admin/plugins',
  handler: handleSearch,
  description: 'Gets the list of available plug-ins.',
  response: searchResultOf(
    z.union([withDates(plugin), withDates(remotePlugin)])
  )
});

export const patchAdminPluginsPluginId = defineRoute({
  verb: 'patch',
  path: '/admin/plugins/:pluginId',
  handler: handlePatch,
  description: 'Updates plugin definition.',
  requiredGlobalPrivilege: 'manageServer',
  request: z.union([plugin, remotePlugin])
});

export const postAdminPlugins = defineRoute({
  verb: 'post',
  path: '/admin/plugins',
  handler: handlePost,
  description: 'Creates a new plug-in.',
  requiredGlobalPrivilege: 'manageServer',
  request: z.union([plugin, remotePlugin])
});

export default defineRouteGroup({
  name: 'Plugin Administration',
  description: 'Manages CIRCUS CS Plug-ins',
  routes: [getAdminPlugins, patchAdminPluginsPluginId, postAdminPlugins]
});
