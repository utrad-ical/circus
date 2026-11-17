import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import {
  allRequiredExcept,
  dbEntry,
  exclude,
  searchResult
} from '../../../schemas/derive.ts';
import { handleGet, handlePatch, handlePost, handleSearch } from './index.ts';
import { user } from '../../../schemas/index.ts';

export const getAdminUsers = defineRoute({
  verb: 'get',
  path: '/admin/users',
  handler: handleSearch,
  description: 'Retrieves the list of users.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResult(user)
});

export const getAdminUsersUserEmail = defineRoute({
  verb: 'get',
  path: '/admin/users/:userEmail',
  handler: handleGet,
  description: 'Retrieves the specified user.',
  requiredGlobalPrivilege: 'manageServer',
  response: dbEntry(exclude(user, ['password']))
});

export const patchAdminUsersUserEmail = defineRoute({
  verb: 'patch',
  path: '/admin/users/:userEmail',
  handler: handlePatch,
  description: 'Updates the specified user.',
  requiredGlobalPrivilege: 'manageServer',
  request: user
});

export const postAdminUsers = defineRoute({
  verb: 'post',
  path: '/admin/users',
  handler: handlePost,
  description: 'Creates a new user.',
  requiredGlobalPrivilege: 'manageServer',
  request: allRequiredExcept(user, [
    'lastLoginTime',
    'lastLoginIp',
    'myLists',
    'preferences'
  ])
});

export default defineRouteGroup({
  name: 'User Administration',
  description: 'Manages login users.',
  routes: [
    getAdminUsers,
    getAdminUsersUserEmail,
    patchAdminUsersUserEmail,
    postAdminUsers
  ]
});
