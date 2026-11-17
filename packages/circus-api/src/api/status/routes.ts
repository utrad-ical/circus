import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet } from './index.ts';

export const getStatus = defineRoute({
  verb: 'get',
  path: '/status',
  handler: handleGet,
  description: 'Returns basic API server status. Can be used for "ping"-ing.',
  noAuthentication: true
});

export default defineRouteGroup({
  name: 'Status',
  description: 'Returns the API server status.',
  routes: [getStatus]
});
