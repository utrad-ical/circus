import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { dbEntry, only } from '../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { user } from '../../schemas/index.ts';

export const getUsersUserEmail = defineRoute({
  verb: 'get',
  path: '/users/:userEmail',
  handler: handleGet,
  description:
    'Gets the information about the specified user. This endpoint is available to all users, but returns only minimum information about the user.',
  response: dbEntry(only(user, ['userEmail', 'loginId', 'description']))
});

export default defineRouteGroup({
  name: 'Users',
  description: 'Fetches minimum information about users.',
  routes: [getUsersUserEmail]
});
