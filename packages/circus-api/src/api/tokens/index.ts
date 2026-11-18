import { httpError } from '../../middleware/errorHandler.ts';
import generatePermanentToken from '../../utils/generatePermanentToken.ts';
import httpStatus from 'http-status';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import status from 'http-status';

export const handleGet: RouteMiddleware<typeof routes.getTokens> = ({
  models
}) => {
  return async (ctx, json) => {
    const results = await models.token.findAll({
      userId: ctx.var.user.userEmail,
      permanentTokenId: { $ne: null }
    });
    return json({
      items: results.map(r => ({
        tokenId: r.permanentTokenId,
        description: r.permanentTokenDescription,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      totalItems: results.length,
      page: 1
    });
  };
};

export const handlePost: RouteMiddleware<typeof routes.postToken> = ({
  models
}) => {
  return async (ctx, json) => {
    const { description } = ctx.req.valid('json');
    const results = await models.token.findAll({
      userId: ctx.var.user.userEmail,
      permanentTokenId: { $ne: null }
    });
    if (results.length > 10)
      throw httpError(
        httpStatus.BAD_REQUEST,
        'You cannot create more than 10 tokens.'
      );

    const data = await generatePermanentToken(
      models,
      ctx.var.user.userEmail,
      description
    );
    return json(
      {
        tokenId: data.permanentTokenId,
        accessToken: data.accessToken
      },
      status.CREATED
    );
  };
};

export const handleDelete: RouteMiddleware<typeof routes.deleteToken> = ({
  models
}) => {
  return async ctx => {
    // Only the owner can delete the token
    const result = await models.token.deleteOne({
      permanentTokenId: ctx.req.param().tokenId,
      userId: ctx.var.user.userEmail
    });
    if (!result.deletedCount) throw httpError(httpStatus.NOT_FOUND);
    return ctx.body(null, 204);
  };
};
