import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { handleGet, handlePatch } from './index.ts';
import { preferences, preferencesPatch } from '../../schemas/index.ts';

export const getPreferences = defineRoute({
  verb: 'get',
  path: '/preferences',
  description: 'Returns the preferences object of the current user.',
  response: preferences.required()
});

export const patchPreferences = defineRoute({
  verb: 'patch',
  path: '/preferences',
  description:
    'Patches the preferences of the current user. All fields are shallow-merged to the root preference object.',
  request: preferencesPatch
});

export default defineRouteGroup({
  name: 'Preferences',
  description:
    'Manages preferences of the log-in user. Note that all the fields are optional.',
  routes: [
    route(getPreferences, handleGet),
    route(patchPreferences, handlePatch)
  ]
});
