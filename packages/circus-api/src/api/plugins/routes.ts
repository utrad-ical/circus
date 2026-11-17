import { z } from 'zod';
import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { dbEntry } from '../../schemas/derive.ts';
import { handleGet, handleList } from './index.ts';
import { plugin, plugins, remotePlugin } from '../../schemas/index.ts';

export const getPluginsPluginId = defineRoute({
  verb: 'get',
  path: '/plugins/:pluginId',
  handler: handleGet,
  description: 'Gets the specified plug-in definition.',
  response: z.union([dbEntry(plugin), dbEntry(remotePlugin)])
});

export const getPlugins = defineRoute({
  verb: 'get',
  path: '/plugins',
  handler: handleList,
  description: 'Gets the list of plug-in definitions.',
  response: plugins
});

export default defineRouteGroup({
  name: 'Plugins',
  description: 'Fetches information about CIRCUS CS Plug-ins.',
  routes: [getPluginsPluginId, getPlugins]
});
