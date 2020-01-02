import { determineUserAccessInfo } from '../../privilegeUtils';
import { Middleware } from 'koa';
import { Models } from '../../db/createModels';

/**
 * This middleware is used in place of createOauthServer when "fix-user" mode
 * is used for debugging purpose. It injects a fixed user into the `ctx`.
 */
const fixUser: (deps: { models: Models }, userEmail: string) => Middleware = (
  { models },
  userEmail
) => {
  return async function fixUser(ctx, next) {
    const user = await models.user.findByIdOrFail(userEmail);
    const privileges = await determineUserAccessInfo(models, user);
    ctx.user = user;
    ctx.userPrivileges = privileges;
    await next();
  };
};

export default fixUser;
