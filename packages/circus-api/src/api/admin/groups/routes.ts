import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { searchResultOf } from '../../../schemas/derive.ts';
import {
  globalPrivileges,
  groupCreate,
  groupDoc,
  groupPatch
} from '@utrad-ical/circus-api-schema';
import {
  handleGet,
  handlePatch,
  handlePost,
  handleSearch,
  listGlobalPrivileges
} from './index.ts';

export const getGroups = defineRoute({
  verb: 'get',
  path: '/admin/groups',
  description: 'Retrieves the list of groups',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResultOf(groupDoc)
});

export const getGroup = defineRoute({
  verb: 'get',
  path: '/admin/groups/:groupId',
  description: 'Retrieves the specified group.',
  requiredGlobalPrivilege: 'manageServer',
  response: groupDoc
});

export const patchGroup = defineRoute({
  verb: 'patch',
  path: '/admin/groups/:groupId',
  description: 'Updates the specified group.',
  requiredGlobalPrivilege: 'manageServer',
  request: groupPatch
});

export const postGroup = defineRoute({
  verb: 'post',
  path: '/admin/groups',
  description: 'Creates a new group.',
  requiredGlobalPrivilege: 'manageServer',
  request: groupCreate,
  response: z.strictObject({ groupId: z.int() })
});

export const getGlobalPrivileges = defineRoute({
  verb: 'get',
  path: '/admin/global-privileges',
  description: 'Retrieves the list of global privileges.',
  requiredGlobalPrivilege: 'manageServer',
  response: globalPrivileges
});

export default defineRouteGroup({
  name: 'Group Administration',
  description: 'Manages user groups.',
  routes: [
    route(getGroups, handleSearch),
    route(getGroup, handleGet),
    route(patchGroup, handlePatch),
    route(postGroup, handlePost),
    route(getGlobalPrivileges, listGlobalPrivileges)
  ]
});
