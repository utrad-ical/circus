import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet } from './index.ts';
import { userPublic } from '@utrad-ical/circus-api-schema';

export const getUser = defineRoute({
  verb: 'get',
  path: '/users/:userEmail',
  description:
    'Gets the information about the specified user. This endpoint is available to all users, but returns only minimum information about the user.',
  response: userPublic
});

export default defineRouteGroup({
  name: 'Users',
  description: 'Fetches minimum information about users.',
  routes: [route(getUser, handleGet)]
});
