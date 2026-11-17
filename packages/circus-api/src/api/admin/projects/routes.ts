import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import {
  allRequiredExcept,
  dbEntry,
  searchResult
} from '../../../schemas/derive.ts';
import { handleGet, handlePatch, handlePost, handleSearch } from './index.ts';
import { project } from '../../../schemas/index.ts';

export const getAdminProjects = defineRoute({
  verb: 'get',
  path: '/admin/projects',
  handler: handleSearch,
  description: 'Retrieves the list of projects.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResult(project)
});

export const getAdminProjectsProjectId = defineRoute({
  verb: 'get',
  path: '/admin/projects/:projectId',
  handler: handleGet,
  description: 'Retrieves the specified project.',
  requiredGlobalPrivilege: 'manageServer',
  response: dbEntry(project)
});

export const patchAdminProjectsProjectId = defineRoute({
  verb: 'patch',
  path: '/admin/projects/:projectId',
  handler: handlePatch,
  description: 'Updates the specified project.',
  requiredGlobalPrivilege: 'manageServer',
  request: project
});

export const postAdminProjects = defineRoute({
  verb: 'post',
  path: '/admin/projects',
  handler: handlePost,
  description: 'Creates a new project.',
  requiredGlobalPrivilege: 'manageServer',
  request: allRequiredExcept(project, ['projectId'])
});

export default defineRouteGroup({
  name: 'Project Administration',
  description: 'Manages projects.',
  routes: [
    getAdminProjects,
    getAdminProjectsProjectId,
    patchAdminProjectsProjectId,
    postAdminProjects
  ]
});
