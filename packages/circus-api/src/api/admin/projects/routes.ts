import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { searchResultOf } from '../../../schemas/derive.ts';
import {
  projectCreate,
  projectDoc,
  projectPatch
} from '../../../schemas/index.ts';
import { handleGet, handlePatch, handlePost, handleSearch } from './index.ts';

export const getProjects = defineRoute({
  verb: 'get',
  path: '/admin/projects',
  description: 'Retrieves the list of projects.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResultOf(projectDoc)
});

export const getProject = defineRoute({
  verb: 'get',
  path: '/admin/projects/:projectId',
  description: 'Retrieves the specified project.',
  requiredGlobalPrivilege: 'manageServer',
  response: projectDoc
});

export const patchProject = defineRoute({
  verb: 'patch',
  path: '/admin/projects/:projectId',
  description: 'Updates the specified project.',
  requiredGlobalPrivilege: 'manageServer',
  request: projectPatch
});

export const postProject = defineRoute({
  verb: 'post',
  path: '/admin/projects',
  description: 'Creates a new project.',
  requiredGlobalPrivilege: 'manageServer',
  request: projectCreate,
  response: projectDoc.pick({ projectId: true })
});

export default defineRouteGroup({
  name: 'Project Administration',
  description: 'Manages projects.',
  routes: [
    route(getProjects, handleSearch),
    route(getProject, handleGet),
    route(patchProject, handlePatch),
    route(postProject, handlePost)
  ]
});
