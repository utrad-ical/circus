export const handleGet = () => {
  return async (ctx, next) => {
    ctx.body = ctx.user.preferences;
  };
};

export const handlePut = ({ models }) => {
  return async (ctx, next) => {
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: ctx.request.body
    });
    ctx.body = null;
  };
};

export const handlePatch = ({ models }) => {
  return async (ctx, next) => {
    await models.user.modifyOne(ctx.user.userEmail, {
      preferences: { ...ctx.user.preferences, ...ctx.request.body }
    });
    ctx.body = null;
  };
};
