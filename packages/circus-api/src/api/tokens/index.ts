import generatePermanentToken from '../../utils/generatePermanentToken.ts';
import httpStatus from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import status from 'http-status';

export const handleGet: RouteMiddleware<typeof routes.getTokens> = ({
  models
}) => {
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

export const handlePost: RouteMiddleware<typeof routes.postToken> = ({
  models
}) => {
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
    ctx.status = status.CREATED;
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteToken> = ({
  models
}) => {
  return async (ctx, next) => {
    // Only the owner can delete the token
    const result = await models.token.deleteOne({
      permanentTokenId: ctx.params.tokenId,
      userId: ctx.user.userEmail
    });
    if (!result.deletedCount) ctx.throw(httpStatus.NOT_FOUND);
    ctx.body = null;
  };
};
