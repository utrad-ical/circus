import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { searchResultOf } from '../../../schemas/derive.ts';
import { handlePatch, handlePost, handleSearch } from './index.ts';
import {
  pluginCreate,
  pluginDoc,
  pluginPatch
} from '@utrad-ical/circus-api-schema';

export const searchPlugins = defineRoute({
  verb: 'get',
  path: '/admin/plugins',
  description: 'Gets the list of available plug-ins.',
  requiredGlobalPrivilege: 'manageServer',
  response: searchResultOf(pluginDoc)
});

export const patchPlugin = defineRoute({
  verb: 'patch',
  path: '/admin/plugins/:pluginId',
  description:
    'Updates plugin definition. The ID and the type cannot be changed.',
  requiredGlobalPrivilege: 'manageServer',
  request: pluginPatch
});

export const postPlugin = defineRoute({
  verb: 'post',
  path: '/admin/plugins',
  description: 'Creates a new plug-in.',
  requiredGlobalPrivilege: 'manageServer',
  request: pluginCreate
});

export default defineRouteGroup({
  name: 'Plugin Administration',
  description: 'Manages CIRCUS CS Plug-ins',
  routes: [
    route(searchPlugins, handleSearch),
    route(patchPlugin, handlePatch),
    route(postPlugin, handlePost)
  ]
});
