import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import {
  handleDelete,
  handleGet,
  handlePatchItems,
  handlePatchList,
  handlePost,
  handleSearch
} from './index.ts';
import {
  myListCreate,
  myListCreated,
  myListItemsPatch,
  myListItemsPatched,
  myListPatch,
  myLists,
  userMyList
} from '../../schemas/index.ts';

export const getMylists = defineRoute({
  verb: 'get',
  path: '/mylists',
  description:
    "Performs search and retrieves a list of the current user's my lists.",
  response: myLists
});

export const getMylistsMyListId = defineRoute({
  verb: 'get',
  path: '/mylists/:myListId',
  description: 'Returns information about the specified my list.',
  response: userMyList.extend({ resourceIds: z.unknown().optional() })
});

export const postMylists = defineRoute({
  verb: 'post',
  path: '/mylists',
  description: 'Creates a new my list.',
  request: myListCreate,
  response: myListCreated
});

export const patchMylistsMyListId = defineRoute({
  verb: 'patch',
  path: '/mylists/:myListId',
  description:
    'Change name, public status, and editors of the specified my list.',
  request: myListPatch
});

export const deleteMylistsMyListId = defineRoute({
  verb: 'delete',
  path: '/mylists/:myListId',
  description: 'Deletes the specified my list.'
});

export const patchMylistsMyListIdItems = defineRoute({
  verb: 'patch',
  path: '/mylists/:myListId/items',
  description: 'Adds items to or removes items from the specified my list.',
  request: myListItemsPatch,
  response: myListItemsPatched
});

export default defineRouteGroup({
  name: 'My Lists',
  description: 'Manages my lists.',
  routes: [
    route(getMylists, handleSearch),
    route(getMylistsMyListId, handleGet),
    route(postMylists, handlePost),
    route(patchMylistsMyListId, handlePatchList),
    route(deleteMylistsMyListId, handleDelete),
    route(patchMylistsMyListIdItems, handlePatchItems)
  ]
});
