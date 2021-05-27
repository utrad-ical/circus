import generatePermanentToken from '../../utils/generatePermanentToken';
import httpStatus from 'http-status';
import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const results = await models.token.findAll({
      userId: ctx.user.userEmail,
      permanentTokenId: { $ne: null }
    });
    ctx.body = {
      items: results.map(r => ({
        tokenId: r.permanentTokenId,
        description: r.permanentTokenDescription,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      totalItems: results.length,
      page: 1
    };
  };
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const { description } = ctx.request.body;
    const results = await models.token.findAll({
      userId: ctx.user.userEmail,
      permanentTokenId: { $ne: null }
    });
    if (results.length > 10)
      ctx.throw(
        httpStatus.BAD_REQUEST,
        'You cannot create more than 10 tokens.'
      );

    const data = await generatePermanentToken(
      models,
      ctx.user.userEmail,
      description
    );
    ctx.body = {
      tokenId: data.permanentTokenId,
      accessToken: data.accessToken
    };
  };
};

export const handleDelete: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const permanentTokenId = ctx.params.tokenId;
    const token = await models.token.findAll({ permanentTokenId });
    if (!token) ctx.throw(httpStatus.NOT_FOUND);
    await models.token.deleteOne({ permanentTokenId });
    ctx.body = null;
  };
};
