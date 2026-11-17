import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import {
  allRequiredExcept,
  dbEntry,
  searchResult
} from '../../../schemas/derive.ts';
import {
  handleGet,
  handlePatch,
  handlePost,
  handleSearch,
  listGlobalPrivileges
} from './index.ts';
import { group } from '../../../schemas/index.ts';

export const getAdminGroups = defineRoute({
  verb: 'get',
  path: '/admin/groups',
  handler: handleSearch,
  description: 'Retrieves the list of groups',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResult(group)
});

export const getAdminGroupsGroupId = defineRoute({
  verb: 'get',
  path: '/admin/groups/:groupId',
  handler: handleGet,
  description: 'Retrieves the specified group.',
  requiredGlobalPrivilege: 'manageServer',
  response: dbEntry(group)
});

export const patchAdminGroupsGroupId = defineRoute({
  verb: 'patch',
  path: '/admin/groups/:groupId',
  handler: handlePatch,
  description: 'Updates the specified group.',
  requiredGlobalPrivilege: 'manageServer',
  request: group
});

export const postAdminGroups = defineRoute({
  verb: 'post',
  path: '/admin/groups',
  handler: handlePost,
  description: 'Creates a new group.',
  requiredGlobalPrivilege: 'manageServer',
  request: allRequiredExcept(group, ['groupId'])
});

export const getAdminGlobalPrivileges = defineRoute({
  verb: 'get',
  path: '/admin/global-privileges',
  handler: listGlobalPrivileges,
  requiredGlobalPrivilege: 'manageServer'
});

export default defineRouteGroup({
  name: 'Group Administration',
  description: 'Manages user groups.',
  routes: [
    getAdminGroups,
    getAdminGroupsGroupId,
    patchAdminGroupsGroupId,
    postAdminGroups,
    getAdminGlobalPrivileges
  ]
});
