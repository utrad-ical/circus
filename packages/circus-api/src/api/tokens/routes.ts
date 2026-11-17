import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { searchResult } from '../../schemas/derive.ts';
import { handleDelete, handleGet, handlePost } from './index.ts';
import {
  permanentToken,
  tokenCreate,
  tokenCreated
} from '../../schemas/index.ts';

export const getTokens = defineRoute({
  verb: 'get',
  path: '/tokens',
  description: 'Retrieves the list of permanent access tokens.',
  response: searchResult(permanentToken)
});

export const postTokens = defineRoute({
  verb: 'post',
  path: '/tokens',
  description: 'Creates a new permanent access token.',
  request: tokenCreate,
  response: tokenCreated
});

export const deleteTokensTokenId = defineRoute({
  verb: 'delete',
  path: '/tokens/:tokenId',
  description: 'Deletes the specified permanent access token.'
});

export default defineRouteGroup({
  name: 'Permanent API Tokens',
  description: 'Retreive information about permanent API tokens.',
  routes: [
    route(getTokens, handleGet),
    route(postTokens, handlePost),
    route(deleteTokensTokenId, handleDelete)
  ]
});
