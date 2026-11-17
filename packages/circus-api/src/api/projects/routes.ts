import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { dbEntry } from '../../schemas/derive.ts';
import { handleGet } from './index.ts';
import { project } from '../../schemas/index.ts';

export const getProjectsProjectId = defineRoute({
  verb: 'get',
  path: '/projects/:projectId',
  handler: handleGet,
  description: 'Returns the project data structure.',
  requiredProjectPrivilege: 'read',
  response: dbEntry(project)
});

export default defineRouteGroup({
  name: 'Projects',
  description: 'Fetches the project data structure.',
  routes: [getProjectsProjectId]
});
