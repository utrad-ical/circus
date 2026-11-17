import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet, handlePost } from './index.ts';

export const postProgress = defineRoute({
  verb: 'post',
  path: '/progress',
  description: 'Issues a new progress ID for the current user.',
  response: z.strictObject({ progressId: z.string() })
});

export const getProgress = defineRoute({
  verb: 'get',
  path: '/progress/:progressId',
  description:
    'Reports the progress of the specified ID using server-sent events.'
});

export default defineRouteGroup({
  name: 'Progress',
  description:
    'Reports the progress of long-running requests such as downloads. Issue a progress ID first, pass it to the request, and subscribe to its server-sent events.',
  routes: [route(postProgress, handlePost), route(getProgress, handleGet)]
});
