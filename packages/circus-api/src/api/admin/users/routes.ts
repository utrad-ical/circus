import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { searchResultOf } from '../../../schemas/derive.ts';
import {
  userCreate,
  userDoc,
  userForAdmin,
  userPatch
} from '@utrad-ical/circus-api-schema';
import { handleGet, handlePatch, handlePost, handleSearch } from './index.ts';

export const getUsers = defineRoute({
  verb: 'get',
  path: '/admin/users',
  description: 'Retrieves the list of users.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResultOf(userForAdmin)
});

export const getUser = defineRoute({
  verb: 'get',
  path: '/admin/users/:userEmail',
  description: 'Retrieves the specified user.',
  requiredGlobalPrivilege: 'manageServer',
  response: userForAdmin
});

export const patchUser = defineRoute({
  verb: 'patch',
  path: '/admin/users/:userEmail',
  description: 'Updates the specified user.',
  requiredGlobalPrivilege: 'manageServer',
  request: userPatch
});

export const postUser = defineRoute({
  verb: 'post',
  path: '/admin/users',
  description: 'Creates a new user.',
  requiredGlobalPrivilege: 'manageServer',
  request: userCreate,
  response: userDoc.pick({ userEmail: true })
});

export default defineRouteGroup({
  name: 'User Administration',
  description: 'Manages login users.',
  routes: [
    route(getUsers, handleSearch),
    route(getUser, handleGet),
    route(patchUser, handlePatch),
    route(postUser, handlePost)
  ]
});
