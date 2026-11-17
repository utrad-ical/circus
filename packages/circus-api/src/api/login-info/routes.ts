import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet, handleGetFull } from './index.ts';

export const getLoginInfo = defineRoute({
  verb: 'get',
  path: '/login-info',
  handler: handleGet
});

export const getLoginInfoFull = defineRoute({
  verb: 'get',
  path: '/login-info/full',
  handler: handleGetFull
});

export default defineRouteGroup({
  name: 'Login Info',
  description: 'Returns information regarding the current user.',
  routes: [getLoginInfo, getLoginInfoFull]
});
