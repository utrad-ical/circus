import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
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
  handler: handleGet,
  description: 'Retrieves the list of permanent access tokens.',
  response: searchResult(permanentToken)
});

export const postTokens = defineRoute({
  verb: 'post',
  path: '/tokens',
  handler: handlePost,
  description: 'Creates a new permanent access token.',
  request: tokenCreate,
  response: tokenCreated
});

export const deleteTokensTokenId = defineRoute({
  verb: 'delete',
  path: '/tokens/:tokenId',
  handler: handleDelete,
  description: 'Deletes the specified permanent access token.'
});

export default defineRouteGroup({
  name: 'Permanent API Tokens',
  description: 'Retreive information about permanent API tokens.',
  routes: [getTokens, postTokens, deleteTokensTokenId]
});
