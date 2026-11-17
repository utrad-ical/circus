import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet } from './index.ts';

export const getPluginDisplaysPluginIdPath = defineRoute({
  verb: 'get',
  path: '/plugin-displays/:pluginId/:path+',
  handler: handleGet,
  description: 'Returns the display using Webpack Module Federation.',
  noAuthentication: true
});

export default defineRouteGroup({
  name: 'Plugin Jobs',
  description: 'Dynamically provides CIRCUS CS displays.',
  routes: [getPluginDisplaysPluginIdPath]
});
