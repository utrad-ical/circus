import { httpError } from '../../../middleware/errorHandler.ts';
import type { RouteMiddleware } from '../../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import generateUniqueId from '../../../utils/generateUniqueId.ts';
import status from 'http-status';
import { randomInt } from 'node:crypto';

const chars = '0123456789abcdefghijklmnopqrstuvwxyz';

const randomStr = (length: number = 32) =>
  Array.from({ length }, () => chars[randomInt(chars.length)]).join('');

export const handlePost: RouteMiddleware<typeof routes.postOnetimeUrl> = ({
  models
}) => {
  return async (ctx, json) => {
    const onetimeUrlId = generateUniqueId();
    const { user } = ctx.req.valid('json');
    const onetimeString = randomStr();

    const userData = await models.user.findAll({
      $or: [{ userEmail: user }, { loginId: user }]
    });
    if (userData.length !== 1) throw httpError(status.NOT_FOUND);
    if (!userData[0].loginEnabled) throw httpError(status.BAD_REQUEST);

    const { userEmail } = userData[0];

    await models.onetimeUrl.insert({ onetimeUrlId, userEmail, onetimeString });
    return json({ onetimeString }, status.CREATED);
  };
};
