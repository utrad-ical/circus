import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet } from './index.ts';

export const getPluginDisplay = defineRoute({
  verb: 'get',
  path: '/plugin-displays/:pluginId/:path+',
  description: 'Returns the display using Webpack Module Federation.',
  noAuthentication: true
});

export default defineRouteGroup({
  name: 'Plugin Jobs',
  description: 'Dynamically provides CIRCUS CS displays.',
  routes: [route(getPluginDisplay, handleGet)]
});
