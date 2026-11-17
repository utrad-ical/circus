import { defineRoute, defineRouteGroup } from '../../../defineRoute.ts';
import { handlePost } from './index.ts';
import { onetimeUrlCreate } from '../../../schemas/index.ts';

export const postAdminOnetimeUrls = defineRoute({
  verb: 'post',
  path: '/admin/onetime-urls',
  handler: handlePost,
  description: 'Creates a new one time url.',
  requiredGlobalPrivilege: 'issueOnetime',
  request: onetimeUrlCreate
});

export default defineRouteGroup({
  name: 'One Time URL',
  description: 'Manages one time url.',
  routes: [postAdminOnetimeUrls]
});
