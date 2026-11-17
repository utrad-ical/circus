import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleDelete, handlePost } from './index.ts';
import { sessionCreate } from '../../schemas/index.ts';

export const postSession = defineRoute({
  verb: 'post',
  path: '/session',
  handler: handlePost,
  description:
    'Logs in with a user name and a password, or with a onetime password issued via the onetime URL, and sets the session cookie.',
  noAuthentication: true,
  request: sessionCreate
});

export const deleteSession = defineRoute({
  verb: 'delete',
  path: '/session',
  handler: handleDelete,
  description: 'Logs out by deleting the current session.',
  noAuthentication: true
});

export default defineRouteGroup({
  name: 'Session',
  description:
    'Manages the browser session of the web UI, kept in an HttpOnly cookie. API clients use access tokens (OAuth or permanent tokens) instead.',
  routes: [postSession, deleteSession]
});
