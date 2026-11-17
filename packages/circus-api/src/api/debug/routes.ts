import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleDummyProgress, handleEcho, handleGet } from './index.ts';

export const getStatus = defineRoute({
  verb: 'get',
  path: '/status',
  description: 'Shows some server status.',
  forDebug: true
});

export const postEcho = defineRoute({
  verb: 'post',
  path: '/echo',
  description: "Echoes what's in the input JSON.",
  forDebug: true
});

export const getDummyProgress = defineRoute({
  verb: 'get',
  path: '/dummy-progress',
  description: 'Returns mock progress event stream.',
  forDebug: true
});

export default defineRouteGroup({
  name: 'Debug',
  description:
    'This is a collection of several debugging routes. These endpoints are turned off if the environment variable `NODE_ENV` is `production`. Enabling these endpoints on production can be a security hole.',
  routes: [
    route(getStatus, handleGet),
    route(postEcho, handleEcho),
    route(getDummyProgress, handleDummyProgress)
  ]
});
