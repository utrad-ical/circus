import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet } from './index.ts';

export const getLogout = defineRoute({
  verb: 'get',
  path: '/logout',
  handler: handleGet,
  description: 'Forces the user to log-out by invalidating the access token.'
});

export default defineRouteGroup({
  name: 'Logout',
  description: 'Forces the user to log-out by invalidating the access token.',
  routes: [getLogout]
});
