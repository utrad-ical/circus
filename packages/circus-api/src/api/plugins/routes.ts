import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet, handleList } from './index.ts';
import { pluginDoc, plugins } from '../../schemas/index.ts';

export const getPlugin = defineRoute({
  verb: 'get',
  path: '/plugins/:pluginId',
  description: 'Gets the specified plug-in definition.',
  response: pluginDoc
});

export const getPlugins = defineRoute({
  verb: 'get',
  path: '/plugins',
  description: 'Gets the list of plug-in definitions.',
  response: plugins
});

export default defineRouteGroup({
  name: 'Plugins',
  description: 'Fetches information about CIRCUS CS Plug-ins.',
  routes: [route(getPlugin, handleGet), route(getPlugins, handleList)]
});
