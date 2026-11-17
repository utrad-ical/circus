import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { handleGet, handlePut } from './index.ts';

export const getBlobHash = defineRoute({
  verb: 'get',
  path: '/blob/:hash',
  handler: handleGet,
  description: 'Fetches the blob specified by the hash.'
});

export const putBlobHash = defineRoute({
  verb: 'put',
  path: '/blob/:hash',
  handler: handlePut,
  description:
    'Stores a new blob. The hash is a SHA-1 of the binary to be stored.',
  expectedContentType: 'application/octet-stream'
});

export default defineRouteGroup({
  name: 'BLOBs',
  description: 'Manages BLOB objects with a hash.',
  routes: [getBlobHash, putBlobHash]
});
