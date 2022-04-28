import { RouteMiddleware } from '../../../typings/middlewares';
import generateUniqueId from '../../../utils/generateUniqueId';
import status from 'http-status';

const randomStr = (length: number = 32) => {
  let result = '';
  while (result.length < length) result += Math.random().toString(36).slice(2);
  return result.slice(0, length);
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const onetimeUrlId = generateUniqueId();
    const { user } = ctx.request.body;
    const onetimeString = randomStr();

    const userData = await models.user.findAll({
      $or: [{ userEmail: user }, { loginId: user }]
    });
    if (userData.length !== 1) ctx.throw(status.NOT_FOUND);
    if (!userData[0].loginEnabled) ctx.throw(status.BAD_REQUEST);

    const { userEmail } = userData[0];

    await models.onetimeUrl.insert({ onetimeUrlId, userEmail, onetimeString });
    ctx.body = { onetimeString };
    ctx.status = status.CREATED;
  };
};
