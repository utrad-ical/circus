import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import {
  handleGet,
  handlePutAll,
  handlePutOne,
  handleSearch
} from './index.ts';
import { serverParams } from '../../../schemas/index.ts';

export const getAdminServerParams = defineRoute({
  verb: 'get',
  path: '/admin/server-params',
  handler: handleSearch,
  description: 'Retrieves the list of server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  response: serverParams
});

export const getAdminServerParamsKey = defineRoute({
  verb: 'get',
  path: '/admin/server-params/:key',
  handler: handleGet,
  description: 'Retrieves the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer'
});

export const putAdminServerParamsKey = defineRoute({
  verb: 'put',
  path: '/admin/server-params/:key',
  handler: handlePutOne,
  description: 'Updates the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer'
});

export const putAdminServerParams = defineRoute({
  verb: 'put',
  path: '/admin/server-params',
  handler: handlePutAll,
  description: 'Bulk-updates server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  request: serverParams
});

export default defineRouteGroup({
  name: 'Server Parameter',
  description: 'Manages login users.',
  routes: [
    getAdminServerParams,
    getAdminServerParamsKey,
    putAdminServerParamsKey,
    putAdminServerParams
  ]
});
