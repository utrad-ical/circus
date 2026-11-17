import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
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
  description: 'Retrieves the list of server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  response: serverParams
});

export const getAdminServerParamsKey = defineRoute({
  verb: 'get',
  path: '/admin/server-params/:key',
  description: 'Retrieves the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer'
});

export const putAdminServerParamsKey = defineRoute({
  verb: 'put',
  path: '/admin/server-params/:key',
  description: 'Updates the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer'
});

export const putAdminServerParams = defineRoute({
  verb: 'put',
  path: '/admin/server-params',
  description: 'Bulk-updates server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  request: serverParams
});

export default defineRouteGroup({
  name: 'Server Parameter',
  description: 'Manages login users.',
  routes: [
    route(getAdminServerParams, handleSearch),
    route(getAdminServerParamsKey, handleGet),
    route(putAdminServerParamsKey, handlePutOne),
    route(putAdminServerParams, handlePutAll)
  ]
});
