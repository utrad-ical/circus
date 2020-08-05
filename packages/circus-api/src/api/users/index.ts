import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const userEmail = ctx.params.userEmail;
    const user = await models.user.findByIdOrFail(userEmail);
    ctx.body = {
      userEmail: user.userEmail,
      description: user.description,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  };
};
