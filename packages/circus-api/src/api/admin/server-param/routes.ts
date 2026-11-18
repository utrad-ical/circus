import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import {
  handleGet,
  handlePutAll,
  handlePutOne,
  handleSearch
} from './index.ts';
import { serverParams } from '@utrad-ical/circus-api-schema';

export const getServerParams = defineRoute({
  verb: 'get',
  path: '/admin/server-params',
  description: 'Retrieves the list of server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  response: serverParams
});

export const getServerParam = defineRoute({
  verb: 'get',
  path: '/admin/server-params/:key',
  description: 'Retrieves the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer',
  response: z.unknown()
});

export const putServerParam = defineRoute({
  verb: 'put',
  path: '/admin/server-params/:key',
  description: 'Updates the specified server parameter.',
  requiredGlobalPrivilege: 'manageServer',
  request: z.unknown()
});

export const putServerParams = defineRoute({
  verb: 'put',
  path: '/admin/server-params',
  description: 'Bulk-updates server parameters.',
  requiredGlobalPrivilege: 'manageServer',
  request: serverParams
});

export default defineRouteGroup({
  name: 'Server Parameter',
  description: 'Manages server parameters.',
  routes: [
    route(getServerParams, handleSearch),
    route(getServerParam, handleGet),
    route(putServerParam, handlePutOne),
    route(putServerParams, handlePutAll)
  ]
});
