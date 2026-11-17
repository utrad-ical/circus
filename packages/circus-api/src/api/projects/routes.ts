import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet } from './index.ts';
import { projectDoc } from '../../schemas/index.ts';

export const getProject = defineRoute({
  verb: 'get',
  path: '/projects/:projectId',
  description: 'Returns the project data structure.',
  requiredProjectPrivilege: 'read',
  response: projectDoc
});

export default defineRouteGroup({
  name: 'Projects',
  description: 'Fetches the project data structure.',
  routes: [route(getProject, handleGet)]
});
