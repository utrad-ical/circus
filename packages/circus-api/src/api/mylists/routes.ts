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
  myListWithItems
} from '@utrad-ical/circus-api-schema';

export const getMyLists = defineRoute({
  verb: 'get',
  path: '/mylists',
  description: "Returns the current user's my lists.",
  response: myLists
});

export const getMyList = defineRoute({
  verb: 'get',
  path: '/mylists/:myListId',
  description:
    'Returns the specified my list with its items. ' +
    'Available to the owner and the editors, or anyone if it is public.',
  response: myListWithItems
});

export const postMyList = defineRoute({
  verb: 'post',
  path: '/mylists',
  description: 'Creates a new my list.',
  request: myListCreate,
  response: myListCreated
});

export const patchMyList = defineRoute({
  verb: 'patch',
  path: '/mylists/:myListId',
  description:
    'Changes the name, the public status and the editors of the specified ' +
    'my list. Available to the owner.',
  request: myListPatch
});

export const deleteMyList = defineRoute({
  verb: 'delete',
  path: '/mylists/:myListId',
  description: 'Deletes the specified my list. Available to the owner.'
});

export const patchMyListItems = defineRoute({
  verb: 'patch',
  path: '/mylists/:myListId/items',
  description:
    'Adds items to or removes items from the specified my list. ' +
    'Available to the owner and the editors.',
  request: myListItemsPatch,
  response: myListItemsPatched
});

export default defineRouteGroup({
  name: 'My Lists',
  description: 'Manages my lists.',
  routes: [
    route(getMyLists, handleSearch),
    route(getMyList, handleGet),
    route(postMyList, handlePost),
    route(patchMyList, handlePatchList),
    route(deleteMyList, handleDelete),
    route(patchMyListItems, handlePatchItems)
  ]
});
