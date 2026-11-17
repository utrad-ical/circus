import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet, handlePost } from './index.ts';

export const postProgress = defineRoute({
  verb: 'post',
  path: '/progress',
  handler: handlePost,
  description: 'Issues a new progress ID for the current user.'
});

export const getProgressProgressId = defineRoute({
  verb: 'get',
  path: '/progress/:progressId',
  handler: handleGet,
  description:
    'Reports the progress of the specified ID using server-sent events.'
});

export default defineRouteGroup({
  name: 'Progress',
  description:
    'Reports the progress of long-running requests such as downloads. Issue a progress ID first, pass it to the request, and subscribe to its server-sent events.',
  routes: [postProgress, getProgressProgressId]
});
