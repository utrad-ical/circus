import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet } from './index.ts';

export const getStatus = defineRoute({
  verb: 'get',
  path: '/status',
  description: 'Returns basic API server status. Can be used for "ping"-ing.',
  noAuthentication: true,
  response: z.strictObject({ status: z.literal('running') })
});

export default defineRouteGroup({
  name: 'Status',
  description: 'Returns the API server status.',
  routes: [route(getStatus, handleGet)]
});
