import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../../defineRoute.ts';
import { handlePost } from './index.ts';
import { onetimeUrlCreate } from '@utrad-ical/circus-api-schema';

export const postOnetimeUrl = defineRoute({
  verb: 'post',
  path: '/admin/onetime-urls',
  description: 'Creates a new one time url.',
  requiredGlobalPrivilege: 'issueOnetime',
  request: onetimeUrlCreate,
  response: z.strictObject({ onetimeString: z.string() })
});

export default defineRouteGroup({
  name: 'One Time URL',
  description: 'Manages one time url.',
  routes: [route(postOnetimeUrl, handlePost)]
});
