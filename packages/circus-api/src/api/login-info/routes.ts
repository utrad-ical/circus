import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { loginInfo, loginInfoFull } from '../../schemas/loginInfo.ts';
import { handleGet, handleGetFull } from './index.ts';

export const getLoginInfo = defineRoute({
  verb: 'get',
  path: '/login-info',
  description: 'Returns the minimum information of the current user.',
  response: loginInfo
});

export const getLoginInfoFull = defineRoute({
  verb: 'get',
  path: '/login-info/full',
  description:
    'Returns the full information of the current user, including the privileges.',
  response: loginInfoFull
});

export default defineRouteGroup({
  name: 'Login Info',
  description: 'Returns information regarding the current user.',
  routes: [
    route(getLoginInfo, handleGet),
    route(getLoginInfoFull, handleGetFull)
  ]
});
