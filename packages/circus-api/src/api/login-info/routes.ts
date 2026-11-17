import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet, handleGetFull } from './index.ts';

export const getLoginInfo = defineRoute({
  verb: 'get',
  path: '/login-info'
});

export const getLoginInfoFull = defineRoute({
  verb: 'get',
  path: '/login-info/full'
});

export default defineRouteGroup({
  name: 'Login Info',
  description: 'Returns information regarding the current user.',
  routes: [
    route(getLoginInfo, handleGet),
    route(getLoginInfoFull, handleGetFull)
  ]
});
